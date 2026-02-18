import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { WAMessage, WASocket } from '@whiskeysockets/baileys';
import FormData from 'form-data';
import { readEnvFile } from './env.js';
import { logger } from './logger.js';
import { logTokenUsage } from './cost-tracker.js';

// Load API configuration from .env
const envConfig = readEnvFile(['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL']);
const LITELLM_API_KEY = process.env.ANTHROPIC_API_KEY || envConfig.ANTHROPIC_API_KEY || '';
const LITELLM_BASE_URL = process.env.ANTHROPIC_BASE_URL || envConfig.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

// Transcribe audio using LiteLLM Whisper API
async function transcribeWithLiteLLM(
  audioBuffer: Buffer,
  groupFolder: string,
  chatJid: string
): Promise<{ text: string; duration: number } | null> {
  if (!LITELLM_API_KEY || LITELLM_API_KEY === '') {
    logger.warn('LiteLLM API key not configured');
    return null;
  }

  try {
    const form = new FormData();
    form.append('file', audioBuffer, {
      filename: 'voice.ogg',
      contentType: 'audio/ogg',
    });
    form.append('model', 'whisper');
    form.append('response_format', 'verbose_json'); // Get duration info

    // Call LiteLLM Whisper API
    const apiUrl = `${LITELLM_BASE_URL}/v1/audio/transcriptions`;

    // Use form-data's built-in submit method instead of fetch
    const response = await new Promise<any>((resolve, reject) => {
      form.submit(
        {
          protocol: apiUrl.startsWith('https') ? 'https:' : 'http:',
          host: new URL(apiUrl).host,
          path: new URL(apiUrl).pathname,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LITELLM_API_KEY}`,
          },
        },
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });

    if (response.statusCode !== 200) {
      let errorText = '';
      for await (const chunk of response) {
        errorText += chunk.toString();
      }
      logger.error({ status: response.statusCode, error: errorText }, 'LiteLLM transcription failed');
      return null;
    }

    let body = '';
    for await (const chunk of response) {
      body += chunk.toString();
    }
    const result = JSON.parse(body) as { text: string; duration?: number };

    // Log cost tracking (duration in seconds)
    if (result.duration) {
      logTokenUsage({
        group_folder: groupFolder,
        chat_jid: chatJid,
        model: 'whisper',
        input_tokens: Math.ceil(result.duration), // 1 token = 1 second
        output_tokens: 0,
        cache_write_tokens: 0,
        cache_read_tokens: 0,
      });
      logger.info({ duration: result.duration, cost: result.duration * 0.0001 }, 'Transcription cost logged');
    }

    return {
      text: result.text,
      duration: result.duration || 0,
    };
  } catch (err) {
    logger.error({ err }, 'LiteLLM transcription failed');
    return null;
  }
}

// Main transcription function
export async function transcribeAudioMessage(
  msg: WAMessage,
  sock: WASocket,
  groupFolder: string,
  chatJid: string
): Promise<string | null> {
  try {
    // Download the audio message
    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: console as any,
        reuploadRequest: sock.updateMediaMessage
      }
    ) as Buffer;

    if (!buffer || buffer.length === 0) {
      logger.error('Failed to download audio message');
      return '[Voice Message - download failed]';
    }

    logger.info(`Downloaded audio message: ${buffer.length} bytes`);

    // Transcribe using LiteLLM
    const result = await transcribeWithLiteLLM(buffer, groupFolder, chatJid);

    if (!result || !result.text) {
      return '[Voice Message - transcription unavailable]';
    }

    return result.text.trim();
  } catch (err) {
    logger.error({ err }, 'Transcription error');
    return '[Voice Message - transcription failed]';
  }
}

// Direct buffer transcription (for Telegram and other sources)
export async function transcribeAudioFromBuffer(
  audioBuffer: Buffer,
  groupFolder: string,
  chatJid: string
): Promise<string | null> {
  try {
    logger.info(`Transcribing audio buffer: ${audioBuffer.length} bytes`);

    // Transcribe using LiteLLM
    const result = await transcribeWithLiteLLM(audioBuffer, groupFolder, chatJid);

    if (!result || !result.text) {
      return null;
    }

    return result.text.trim();
  } catch (err) {
    logger.error({ err }, 'Transcription error');
    return null;
  }
}

// Helper to check if a message is a voice note
export function isVoiceMessage(msg: WAMessage): boolean {
  return msg.message?.audioMessage?.ptt === true;
}
