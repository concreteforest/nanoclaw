import Database from 'better-sqlite3';
import path from 'path';
import { STORE_DIR } from './config.js';

interface TokenUsage {
  id: string;
  timestamp: string;
  group_folder: string;
  chat_jid: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens: number;
  cache_read_tokens: number;
  input_cost: number;
  output_cost: number;
  cache_write_cost: number;
  cache_read_cost: number;
  total_cost: number;
  message_id?: string;
}

interface ModelPricing {
  model: string;
  input_cost_per_million: number;
  output_cost_per_million: number;
  cache_write_cost_per_million: number;
  cache_read_cost_per_million: number;
}

// Pricing from LiteLLM models page (as of 2026-02-18)
const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-20241022': {
    model: 'claude-3-5-sonnet-20241022',
    input_cost_per_million: 3.00,
    output_cost_per_million: 15.00,
    cache_write_cost_per_million: 3.75,
    cache_read_cost_per_million: 0.30,
  },
  'claude-3-5-sonnet-latest': {
    model: 'claude-3-5-sonnet-latest',
    input_cost_per_million: 3.00,
    output_cost_per_million: 15.00,
    cache_write_cost_per_million: 3.75,
    cache_read_cost_per_million: 0.30,
  },
  'claude-3-7-sonnet-20250219': {
    model: 'claude-3-7-sonnet-20250219',
    input_cost_per_million: 3.00,
    output_cost_per_million: 15.00,
    cache_write_cost_per_million: 3.75,
    cache_read_cost_per_million: 0.30,
  },
  'claude-3-7-sonnet-latest': {
    model: 'claude-3-7-sonnet-latest',
    input_cost_per_million: 3.00,
    output_cost_per_million: 15.00,
    cache_write_cost_per_million: 3.75,
    cache_read_cost_per_million: 0.30,
  },
  // Audio models - Whisper pricing is per second, not per token
  // From LiteLLM pricing: $0.0001 per second for both input and output
  // For cost tracking purposes, we'll treat audio duration as "tokens"
  // where 1 token = 1 second of audio
  'whisper-1': {
    model: 'whisper-1',
    input_cost_per_million: 100.0, // $0.0001 per second * 1,000,000 = $100 per million seconds
    output_cost_per_million: 100.0, // $0.0001 per second * 1,000,000 = $100 per million seconds
    cache_write_cost_per_million: 0.0,
    cache_read_cost_per_million: 0.0,
  },
  'whisper': {
    model: 'whisper',
    input_cost_per_million: 100.0, // Alias for whisper-1
    output_cost_per_million: 100.0, // $0.0001 per second * 1,000,000 = $100 per million seconds
    cache_write_cost_per_million: 0.0,
    cache_read_cost_per_million: 0.0,
  },
};

let db: Database.Database;

export function initCostTracking(): void {
  const dbPath = path.join(STORE_DIR, 'messages.db');
  db = new Database(dbPath);

  // Create token_usage table
  db.exec(`
    CREATE TABLE IF NOT EXISTS token_usage (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      group_folder TEXT NOT NULL,
      chat_jid TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cache_write_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      input_cost REAL NOT NULL,
      output_cost REAL NOT NULL,
      cache_write_cost REAL DEFAULT 0,
      cache_read_cost REAL DEFAULT 0,
      total_cost REAL NOT NULL,
      message_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_token_usage_timestamp ON token_usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_token_usage_group ON token_usage(group_folder);
    CREATE INDEX IF NOT EXISTS idx_token_usage_chat ON token_usage(chat_jid);
  `);
}

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheWriteTokens: number = 0,
  cacheReadTokens: number = 0,
): {
  input_cost: number;
  output_cost: number;
  cache_write_cost: number;
  cache_read_cost: number;
  total_cost: number;
} {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-5-sonnet-latest'];

  const input_cost = (inputTokens / 1_000_000) * pricing.input_cost_per_million;
  const output_cost = (outputTokens / 1_000_000) * pricing.output_cost_per_million;
  const cache_write_cost =
    (cacheWriteTokens / 1_000_000) * pricing.cache_write_cost_per_million;
  const cache_read_cost =
    (cacheReadTokens / 1_000_000) * pricing.cache_read_cost_per_million;

  const total_cost = input_cost + output_cost + cache_write_cost + cache_read_cost;

  return {
    input_cost: Math.round(input_cost * 1000000) / 1000000, // Round to 6 decimal places
    output_cost: Math.round(output_cost * 1000000) / 1000000,
    cache_write_cost: Math.round(cache_write_cost * 1000000) / 1000000,
    cache_read_cost: Math.round(cache_read_cost * 1000000) / 1000000,
    total_cost: Math.round(total_cost * 1000000) / 1000000,
  };
}

export function logTokenUsage(params: {
  group_folder: string;
  chat_jid: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_write_tokens?: number;
  cache_read_tokens?: number;
  message_id?: string;
}): void {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  const costs = calculateCost(
    params.model,
    params.input_tokens,
    params.output_tokens,
    params.cache_write_tokens,
    params.cache_read_tokens,
  );

  db.prepare(
    `
    INSERT INTO token_usage (
      id, timestamp, group_folder, chat_jid, model,
      input_tokens, output_tokens, cache_write_tokens, cache_read_tokens,
      input_cost, output_cost, cache_write_cost, cache_read_cost, total_cost,
      message_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    timestamp,
    params.group_folder,
    params.chat_jid,
    params.model,
    params.input_tokens,
    params.output_tokens,
    params.cache_write_tokens || 0,
    params.cache_read_tokens || 0,
    costs.input_cost,
    costs.output_cost,
    costs.cache_write_cost,
    costs.cache_read_cost,
    costs.total_cost,
    params.message_id || null,
  );
}

export interface CostSummary {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_write_tokens: number;
  total_cache_read_tokens: number;
  total_requests: number;
  period_start: string;
  period_end: string;
  by_group?: Record<string, { cost: number; requests: number }>;
  by_model?: Record<string, { cost: number; requests: number }>;
}

export function getCostSummary(
  startDate?: string,
  endDate?: string,
  groupFolder?: string,
): CostSummary {
  let query = `
    SELECT
      SUM(total_cost) as total_cost,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(cache_write_tokens) as total_cache_write_tokens,
      SUM(cache_read_tokens) as total_cache_read_tokens,
      COUNT(*) as total_requests,
      MIN(timestamp) as period_start,
      MAX(timestamp) as period_end
    FROM token_usage
    WHERE 1=1
  `;

  const params: string[] = [];

  if (startDate) {
    query += ' AND timestamp >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND timestamp <= ?';
    params.push(endDate);
  }

  if (groupFolder) {
    query += ' AND group_folder = ?';
    params.push(groupFolder);
  }

  const result = db.prepare(query).get(...params) as CostSummary;

  // Get breakdown by group
  const byGroupQuery = `
    SELECT group_folder, SUM(total_cost) as cost, COUNT(*) as requests
    FROM token_usage
    WHERE 1=1 ${startDate ? 'AND timestamp >= ?' : ''} ${endDate ? 'AND timestamp <= ?' : ''}
    GROUP BY group_folder
  `;
  const groupParams: string[] = [];
  if (startDate) groupParams.push(startDate);
  if (endDate) groupParams.push(endDate);

  const byGroup = db.prepare(byGroupQuery).all(...groupParams) as Array<{
    group_folder: string;
    cost: number;
    requests: number;
  }>;

  result.by_group = {};
  for (const row of byGroup) {
    result.by_group[row.group_folder] = { cost: row.cost, requests: row.requests };
  }

  // Get breakdown by model
  const byModelQuery = `
    SELECT model, SUM(total_cost) as cost, COUNT(*) as requests
    FROM token_usage
    WHERE 1=1 ${startDate ? 'AND timestamp >= ?' : ''} ${endDate ? 'AND timestamp <= ?' : ''}
    GROUP BY model
  `;

  const byModel = db.prepare(byModelQuery).all(...groupParams) as Array<{
    model: string;
    cost: number;
    requests: number;
  }>;

  result.by_model = {};
  for (const row of byModel) {
    result.by_model[row.model] = { cost: row.cost, requests: row.requests };
  }

  return result;
}

export function getDailyCosts(days: number = 30): Array<{
  date: string;
  cost: number;
  requests: number;
}> {
  const query = `
    SELECT
      DATE(timestamp) as date,
      SUM(total_cost) as cost,
      COUNT(*) as requests
    FROM token_usage
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `;

  return db.prepare(query).all() as Array<{
    date: string;
    cost: number;
    requests: number;
  }>;
}

export function getDailyCostUSD(): number {
  if (!db) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const startTimestamp = today.toISOString();

  const query = `
    SELECT SUM(total_cost) as total
    FROM token_usage
    WHERE timestamp >= ?
  `;

  const row = db.prepare(query).get(startTimestamp) as { total: number | null };
  return row?.total || 0;
}

export function formatCostReport(summary: CostSummary): string {
  let report = `*Cost Summary*\n\n`;
  report += `Total Cost: $${summary.total_cost.toFixed(4)}\n`;
  report += `Total Requests: ${summary.total_requests}\n`;
  report += `Period: ${summary.period_start} to ${summary.period_end}\n\n`;

  report += `*Token Usage:*\n`;
  report += `• Input: ${summary.total_input_tokens.toLocaleString()} tokens\n`;
  report += `• Output: ${summary.total_output_tokens.toLocaleString()} tokens\n`;
  report += `• Cache Write: ${summary.total_cache_write_tokens.toLocaleString()} tokens\n`;
  report += `• Cache Read: ${summary.total_cache_read_tokens.toLocaleString()} tokens\n\n`;

  if (summary.by_group && Object.keys(summary.by_group).length > 0) {
    report += `*By Group:*\n`;
    for (const [group, data] of Object.entries(summary.by_group)) {
      report += `• ${group}: $${data.cost.toFixed(4)} (${data.requests} requests)\n`;
    }
    report += '\n';
  }

  if (summary.by_model && Object.keys(summary.by_model).length > 0) {
    report += `*By Model:*\n`;
    for (const [model, data] of Object.entries(summary.by_model)) {
      report += `• ${model}: $${data.cost.toFixed(4)} (${data.requests} requests)\n`;
    }
  }

  return report;
}
