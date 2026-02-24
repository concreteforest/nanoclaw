/**
 * NanoClaw Agent Runner
 * Runs inside a container, receives config via stdin, outputs result to stdout
 */

import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import { query, HookCallback, PreCompactHookInput, PreToolUseHookInput } from '@anthropic-ai/claude-agent-sdk';
import { fileURLToPath } from 'url';

interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  isScheduledTask?: boolean;
  assistantName?: string;
  secrets?: Record<string, string>;
  model?: string;
}

interface ContainerOutput {
  status: 'success' | 'error';
  result: string | null;
  newSessionId?: string;
  error?: string;
}

interface SessionEntry {
  sessionId: string;
  fullPath: string;
  summary: string;
  firstPrompt: string;
}

interface SessionsIndex {
  entries: SessionEntry[];
}

const MODEL_ALIASES: Record<string, string> = {
  haiku: 'bedrock-claude-4-5-haiku',
  sonnet: 'vertex-claude-4-5-sonnet',
  opus: 'bedrock-anthropic-claude-4-5-opus',
  'gemini-2.5-flash': 'gemini/gemini-1.5-flash',
  'gemini-1.5-flash': 'gemini/gemini-1.5-flash',
  'gemini-3': 'gemini/gemini-3',
};

function resolveModel(alias: string): string {
  return MODEL_ALIASES[alias.toLowerCase()] || alias;
}

interface SDKUserMessage {
  type: 'user';
  message: { role: 'user'; content: string };
  parent_tool_use_id: null;
  session_id: string;
}

const IPC_INPUT_DIR = '/workspace/ipc/input';
const IPC_INPUT_CLOSE_SENTINEL = path.join(IPC_INPUT_DIR, '_close');
const IPC_POLL_MS = 500;

class MessageStream {
  private queue: SDKUserMessage[] = [];
  private waiting: (() => void) | null = null;
  private done = false;

  push(text: string): void {
    this.queue.push({
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
      session_id: '',
    });
    this.waiting?.();
  }

  end(): void {
    this.done = true;
    this.waiting?.();
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<SDKUserMessage> {
    while (true) {
      while (this.queue.length > 0) {
        yield this.queue.shift()!;
      }
      if (this.done) return;
      await new Promise<void>(r => { this.waiting = r; });
      this.waiting = null;
    }
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANOCLAW_OUTPUT_END---';

function writeOutput(output: ContainerOutput): void {
  console.log(OUTPUT_START_MARKER);
  console.log(JSON.stringify(output));
  console.log(OUTPUT_END_MARKER);
}

function log(message: string): void {
  console.error(`[agent-runner] ${message}`);
}

function getSessionSummary(sessionId: string, transcriptPath: string): string | null {
  const projectDir = path.dirname(transcriptPath);
  const indexPath = path.join(projectDir, 'sessions-index.json');
  if (!fs.existsSync(indexPath)) return null;
  try {
    const index: SessionsIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const entry = index.entries.find(e => e.sessionId === sessionId);
    return entry?.summary || null;
  } catch { return null; }
}

function sanitizeFilename(summary: string): string {
  return summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

function generateFallbackName(): string {
  const time = new Date();
  return `conversation-${time.getHours().toString().padStart(2, '0')}${time.getMinutes().toString().padStart(2, '0')}`;
}

function createPreCompactHook(groupFolder: string, assistantName?: string): HookCallback {
  return async (input, _toolUseId, _context) => {
    const preCompact = input as PreCompactHookInput;
    const transcriptPath = preCompact.transcript_path;
    const sessionId = preCompact.session_id;
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return {};
    try {
      const content = fs.readFileSync(transcriptPath, 'utf-8');
      const messages = parseTranscript(content);
      if (messages.length === 0) return {};
      const summary = getSessionSummary(sessionId, transcriptPath);
      const name = summary ? sanitizeFilename(summary) : generateFallbackName();
      const conversationsDir = `/workspace/group-${groupFolder}/conversations`;
      fs.mkdirSync(conversationsDir, { recursive: true });
      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}-${name}.md`;
      const filePath = path.join(conversationsDir, filename);
      fs.writeFileSync(filePath, formatTranscriptMarkdown(messages, summary, assistantName));
      log(`Archived conversation to ${filePath}`);
    } catch { }
    return {};
  };
}

const SECRET_ENV_VARS = ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_BASE_URL'];

function createSanitizeBashHook(): HookCallback {
  return async (input, _toolUseId, _context) => {
    const preInput = input as PreToolUseHookInput;
    const command = (preInput.tool_input as { command?: string })?.command;
    if (!command) return {};
    const unsetPrefix = `unset ${SECRET_ENV_VARS.join(' ')} 2>/dev/null; `;
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        updatedInput: {
          ...(preInput.tool_input as Record<string, unknown>),
          command: unsetPrefix + command,
        },
      },
    };
  };
}

/**
 * Standardize numeric toolUseIds into strings (Gemini via LiteLLM often returns numbers)
 */
function createStandardizeIdHook(): HookCallback {
  return async (input, _toolUseId, _context) => {
    const toolUseId = _toolUseId;
    const isNumeric = typeof toolUseId === 'number' || (typeof toolUseId === 'string' && /^\d+$/.test(toolUseId));
    if (isNumeric) {
      log(`Standardizing numeric toolUseId: ${toolUseId} -> tool_${toolUseId}`);
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          updatedInput: { ...(input as PreToolUseHookInput).tool_input as any },
        },
      };
    }
    return {};
  };
}

interface ParsedMessage { role: 'user' | 'assistant'; content: string; }

function parseTranscript(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'user' && entry.message?.content) {
        const text = typeof entry.message.content === 'string' ? entry.message.content : entry.message.content.map((c: any) => c.text || '').join('');
        if (text) messages.push({ role: 'user', content: text });
      } else if (entry.type === 'assistant' && entry.message?.content) {
        const text = entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
        if (text) messages.push({ role: 'assistant', content: text });
      }
    } catch { }
  }
  return messages;
}

function formatTranscriptMarkdown(messages: ParsedMessage[], title?: string | null, assistantName?: string): string {
  const lines = [`# ${title || 'Conversation'}`, '', `Archived: ${new Date().toLocaleString()}`, '', '---', ''];
  for (const msg of messages) {
    const sender = msg.role === 'user' ? 'User' : (assistantName || 'Assistant');
    const content = msg.content.length > 2000 ? msg.content.slice(0, 2000) + '...' : msg.content;
    lines.push(`**${sender}**: ${content}\n`);
  }
  return lines.join('\n');
}

function shouldClose(): boolean {
  if (fs.existsSync(IPC_INPUT_CLOSE_SENTINEL)) {
    try { fs.unlinkSync(IPC_INPUT_CLOSE_SENTINEL); } catch { }
    return true;
  }
  return false;
}

function drainIpcInput(): string[] {
  try {
    fs.mkdirSync(IPC_INPUT_DIR, { recursive: true });
    const files = fs.readdirSync(IPC_INPUT_DIR).filter(f => f.endsWith('.json')).sort();
    const messages: string[] = [];
    for (const file of files) {
      const filePath = path.join(IPC_INPUT_DIR, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        fs.unlinkSync(filePath);
        if (data.type === 'message' && data.text) messages.push(data.text);
      } catch { try { fs.unlinkSync(filePath); } catch { } }
    }
    return messages;
  } catch { return []; }
}

function waitForIpcMessage(): Promise<string | null> {
  return new Promise((resolve) => {
    const poll = () => {
      if (shouldClose()) { resolve(null); return; }
      const messages = drainIpcInput();
      if (messages.length > 0) { resolve(messages.join('\n')); return; }
      setTimeout(poll, IPC_POLL_MS);
    };
    poll();
  });
}

async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  mcpServerPath: string,
  containerInput: ContainerInput,
  sdkEnv: Record<string, string | undefined>,
  resumeAt?: string,
): Promise<{ newSessionId?: string, lastAssistantUuid?: string, closedDuringQuery: boolean }> {
  const workspacePath = `/workspace/group-${containerInput.groupFolder}`;
  const stream = new MessageStream();
  stream.push(prompt);

  let ipcPolling = true;
  let closedDuringQuery = false;
  const pollIpcDuringQuery = () => {
    if (!ipcPolling) return;
    if (shouldClose()) { closedDuringQuery = true; stream.end(); ipcPolling = false; return; }
    const messages = drainIpcInput();
    for (const text of messages) stream.push(text);
    setTimeout(pollIpcDuringQuery, IPC_POLL_MS);
  };
  setTimeout(pollIpcDuringQuery, IPC_POLL_MS);

  let newSessionId: string | undefined;
  let lastAssistantUuid: string | undefined;
  let messageCount = 0;
  let resultCount = 0;

  const proactiveInstructions = `\n# Proactive Memory System\n... (instructions) ...\n`;
  let systemPrompt: any = { type: 'preset' as const, preset: 'claude_code' as const, append: proactiveInstructions };

  for await (const message of query({
    prompt: stream,
    options: {
      cwd: workspacePath,
      resume: sessionId,
      resumeSessionAt: resumeAt,
      model: containerInput.model ? resolveModel(containerInput.model) : undefined,
      systemPrompt,
      allowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Task', 'Skill', 'mcp__nanoclaw__*', 'mcp__google_workspace__*'],
      env: { ...sdkEnv, LITELLM_LOG: 'DEBUG' },
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      mcpServers: {
        nanoclaw: { command: 'node', args: [mcpServerPath], env: { NANOCLAW_CHAT_JID: containerInput.chatJid, NANOCLAW_GROUP_FOLDER: containerInput.groupFolder, NANOCLAW_IS_MAIN: containerInput.isMain ? '1' : '0' } }
      },
      hooks: {
        PreCompact: [{ hooks: [createPreCompactHook(containerInput.groupFolder, containerInput.assistantName)] }],
        PreToolUse: [
          { matcher: '*', hooks: [createStandardizeIdHook()] },
          { matcher: 'Bash', hooks: [createSanitizeBashHook()] }
        ],
      },
    }
  })) {
    messageCount++;
    log(`[msg #${messageCount}] type=${message.type} data=${JSON.stringify(message).slice(0, 500)}`);
    if (message.type === 'assistant' && 'uuid' in message) lastAssistantUuid = (message as any).uuid;
    if (message.type === 'system' && message.subtype === 'init') { newSessionId = message.session_id; log(`Session initialized: ${newSessionId}`); }
    if (message.type === 'result') {
      resultCount++;
      const textResult = 'result' in message ? (message as any).result : null;
      writeOutput({ status: 'success', result: textResult || null, newSessionId });
    }
  }
  ipcPolling = false;
  return { newSessionId, lastAssistantUuid, closedDuringQuery };
}

async function startProxy(containerInput: ContainerInput, sdkEnv: Record<string, string | undefined>): Promise<{ cleanup: () => void, getProxyLogs: () => string }> {
  const resolvedModel = containerInput.model ? resolveModel(containerInput.model) : undefined;
  const port = 42819;

  if (resolvedModel && resolvedModel.startsWith('gemini') && containerInput.secrets?.GOOGLE_API_KEY) {
    log('Starting local LiteLLM proxy for Gemini model bypass...');
    const proxyProc = spawn('litellm', ['--model', `gemini/${resolvedModel}`, '--port', port.toString(), '--drop_params', '--debug'], {
      env: { ...process.env, GEMINI_API_KEY: containerInput.secrets.GOOGLE_API_KEY },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let proxyLogs = '';
    const appendLog = (d: Buffer | string) => { proxyLogs += d.toString(); if (proxyLogs.length > 100000) proxyLogs = proxyLogs.slice(-50000); };
    proxyProc.stdout.on('data', appendLog);
    proxyProc.stderr.on('data', appendLog);

    let proxyCrashed = false;
    proxyProc.on('exit', (c) => { if (c !== 0 && c !== null) { log(`Proxy crashed code ${c}`); proxyCrashed = true; } });
    const cleanup = () => { try { proxyProc.kill('SIGKILL'); } catch { } };

    let ready = false;
    for (let i = 0; i < 30; i++) {
      if (proxyCrashed) break;
      try {
        await new Promise(r => setTimeout(r, 1000));
        const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
        log(`Health check: ${res.status}`);
        if (res.status < 600) { ready = true; break; }
      } catch { }
    }

    if (!ready) { cleanup(); log(`Proxy start failed. Logs:\n${proxyLogs}`); process.exit(1); }
    sdkEnv.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
    sdkEnv.ANTHROPIC_API_KEY = containerInput.secrets.GOOGLE_API_KEY;
    log('Local proxy ready on ' + port);
    return { cleanup, getProxyLogs: () => proxyLogs };
  }
  return { cleanup: () => { }, getProxyLogs: () => '' };
}

async function main(): Promise<void> {
  let containerInput;
  try {
    const stdinData = await readStdin();
    containerInput = JSON.parse(stdinData);
    try { fs.unlinkSync('/tmp/input.json'); } catch { }
    log(`Input for group: ${containerInput.groupFolder}`);
  } catch (err) { writeOutput({ status: 'error', result: null, error: 'Parse failed' }); process.exit(1); }

  const sdkEnv: any = { ...process.env };
  if (containerInput.secrets) { for (const [k, v] of Object.entries(containerInput.secrets)) sdkEnv[k] = v; }
  sdkEnv.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS = '1';

  const mcpServerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ipc-mcp-stdio.js');
  const { cleanup, getProxyLogs } = await startProxy(containerInput, sdkEnv);
  process.on('SIGINT', cleanup); process.on('SIGTERM', cleanup); process.on('exit', cleanup);

  let sessionId = containerInput.sessionId;
  let prompt = containerInput.prompt;
  let resumeAt: string | undefined;

  try {
    while (true) {
      log(`Query loop start (session: ${sessionId || 'new'})`);
      const res = await runQuery(prompt, sessionId, mcpServerPath, containerInput, sdkEnv, resumeAt);
      if (res.newSessionId) sessionId = res.newSessionId;
      if (res.lastAssistantUuid) resumeAt = res.lastAssistantUuid;
      if (res.closedDuringQuery) break;
      writeOutput({ status: 'success', result: null, newSessionId: sessionId });
      const next = await waitForIpcMessage();
      if (next === null) break;
      prompt = next;
    }
  } catch (err: any) {
    log(`Agent error: ${err.message}\nProxy logs:\n${getProxyLogs()}`);
    writeOutput({ status: 'error', result: null, newSessionId: sessionId, error: err.message });
    process.exit(1);
  } finally { cleanup(); }
}

main();
