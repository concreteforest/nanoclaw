import { Bot } from "grammy";

import {
  ASSISTANT_NAME,
  TRIGGER_PATTERN,
} from "../config.js";
import { getDefaultModel, setDefaultModel } from "../db.js";
import { logger } from "../logger.js";
import { Channel, OnInboundMessage, OnChatMetadata, RegisteredGroup } from "../types.js";

export interface TelegramChannelOpts {
  onMessage: OnInboundMessage;
  onChatMetadata: OnChatMetadata;
  registeredGroups: () => Record<string, RegisteredGroup>;
}

export class TelegramChannel implements Channel {
  name = "telegram";

  private bot: Bot | null = null;
  private opts: TelegramChannelOpts;
  private botToken: string;

  constructor(botToken: string, opts: TelegramChannelOpts) {
    this.botToken = botToken;
    this.opts = opts;
  }

  async connect(): Promise<void> {
    this.bot = new Bot(this.botToken);

    // Command to get chat ID (useful for registration)
    this.bot.command("chatid", (ctx) => {
      const chatId = ctx.chat.id;
      const chatType = ctx.chat.type;
      const chatName =
        chatType === "private"
          ? ctx.from?.first_name || "Private"
          : (ctx.chat as any).title || "Unknown";

      ctx.reply(
        `Chat ID: \`tg:${chatId}\`\nName: ${chatName}\nType: ${chatType}`,
        { parse_mode: "Markdown" },
      );
    });

    // Command to check bot status
    this.bot.command("ping", (ctx) => {
      ctx.reply(`${ASSISTANT_NAME} is online.`);
    });

    // Command to view/set default model
    this.bot.command("model", async (ctx) => {
      if (!ctx.message) return;
      const args = ctx.message.text.split(/\s+/).slice(1);
      const adminUserId = process.env.TELEGRAM_ADMIN_ID;

      if (args.length === 0) {
        // View current default
        const currentModel = getDefaultModel();
        await ctx.reply(`Current default model: ${currentModel}`);
        return;
      }

      // Set new default (admin only)
      const requestedModel = args[0].toLowerCase();
      const validModels = ['haiku', 'sonnet', 'opus'];

      if (!validModels.includes(requestedModel)) {
        await ctx.reply(`Invalid model. Choose: haiku, sonnet, or opus`);
        return;
      }

      const senderId = ctx.from?.id.toString();
      if (adminUserId && senderId !== adminUserId) {
        await ctx.reply('Only the admin can change the default model');
        return;
      }

      setDefaultModel(requestedModel);
      await ctx.reply(`Default model set to ${requestedModel}`);
    });

    this.bot.on("message:text", async (ctx) => {
      // Skip commands
      if (ctx.message.text.startsWith("/")) return;

      const chatJid = `tg:${ctx.chat.id}`;
      let content = ctx.message.text;
      const timestamp = new Date(ctx.message.date * 1000).toISOString();
      const senderName =
        ctx.from?.first_name ||
        ctx.from?.username ||
        ctx.from?.id.toString() ||
        "Unknown";
      const sender = ctx.from?.id.toString() || "";
      const msgId = ctx.message.message_id.toString();

      // Determine chat name
      const chatName =
        ctx.chat.type === "private"
          ? senderName
          : (ctx.chat as any).title || chatJid;

      // Translate Telegram @bot_username mentions into TRIGGER_PATTERN format.
      // Telegram @mentions (e.g., @andy_ai_bot) won't match TRIGGER_PATTERN
      // (e.g., ^@Nano\b), so we prepend the trigger when the bot is @mentioned.
      const botUsername = ctx.me?.username?.toLowerCase();
      if (botUsername) {
        const entities = ctx.message.entities || [];
        const isBotMentioned = entities.some((entity) => {
          if (entity.type === "mention") {
            const mentionText = content
              .substring(entity.offset, entity.offset + entity.length)
              .toLowerCase();
            return mentionText === `@${botUsername}`;
          }
          return false;
        });
        if (isBotMentioned && !TRIGGER_PATTERN.test(content)) {
          content = `@${ASSISTANT_NAME} ${content}`;
        }
      }

      // Store chat metadata for discovery
      this.opts.onChatMetadata(chatJid, timestamp, chatName);

      // Only deliver full message for registered groups
      const group = this.opts.registeredGroups()[chatJid];
      if (!group) {
        logger.debug(
          { chatJid, chatName },
          "Message from unregistered Telegram chat",
        );
        return;
      }

      // Deliver message — startMessageLoop() will pick it up
      this.opts.onMessage(chatJid, {
        id: msgId,
        chat_jid: chatJid,
        sender,
        sender_name: senderName,
        content,
        timestamp,
        is_from_me: false,
      });

      logger.info(
        { chatJid, chatName, sender: senderName },
        "Telegram message stored",
      );
    });

    // Handle non-text messages with placeholders so the agent knows something was sent
    const storeNonText = (ctx: any, placeholder: string) => {
      const chatJid = `tg:${ctx.chat.id}`;
      const group = this.opts.registeredGroups()[chatJid];
      if (!group) return;

      const timestamp = new Date(ctx.message.date * 1000).toISOString();
      const senderName =
        ctx.from?.first_name || ctx.from?.username || ctx.from?.id?.toString() || "Unknown";
      const caption = ctx.message.caption ? ` ${ctx.message.caption}` : "";

      this.opts.onChatMetadata(chatJid, timestamp);
      this.opts.onMessage(chatJid, {
        id: ctx.message.message_id.toString(),
        chat_jid: chatJid,
        sender: ctx.from?.id?.toString() || "",
        sender_name: senderName,
        content: `${placeholder}${caption}`,
        timestamp,
        is_from_me: false,
      });
    };

    this.bot.on("message:photo", (ctx) => storeNonText(ctx, "[Photo]"));
    this.bot.on("message:video", (ctx) => storeNonText(ctx, "[Video]"));
    this.bot.on("message:voice", async (ctx) => {
      const chatJid = `tg:${ctx.chat.id}`;
      const group = this.opts.registeredGroups()[chatJid];
      if (!group) return;

      try {
        // Download voice message from Telegram
        const file = await ctx.getFile();
        const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${file.file_path}`;

        // Fetch the voice file
        const response = await fetch(fileUrl);
        const audioBuffer = Buffer.from(await response.arrayBuffer());

        // Transcribe using our transcription module
        const { transcribeAudioFromBuffer } = await import('../transcription.js');
        const transcript = await transcribeAudioFromBuffer(audioBuffer, group.folder, chatJid);

        const timestamp = new Date(ctx.message.date * 1000).toISOString();
        const senderName =
          ctx.from?.first_name || ctx.from?.username || ctx.from?.id?.toString() || "Unknown";
        const caption = ctx.message.caption ? ` ${ctx.message.caption}` : "";

        this.opts.onChatMetadata(chatJid, timestamp);
        this.opts.onMessage(chatJid, {
          id: ctx.message.message_id.toString(),
          chat_jid: chatJid,
          sender: ctx.from?.id?.toString() || "",
          sender_name: senderName,
          content: transcript ? `[Voice: ${transcript}]${caption}` : `[Voice message - transcription failed]${caption}`,
          timestamp,
          is_from_me: false,
        });

        logger.info({ chatJid, length: transcript?.length }, 'Transcribed Telegram voice message');
      } catch (err) {
        logger.error({ err }, 'Telegram voice transcription error');
        storeNonText(ctx, "[Voice message - transcription failed]");
      }
    });
    this.bot.on("message:audio", (ctx) => storeNonText(ctx, "[Audio]"));
    this.bot.on("message:document", (ctx) => {
      const name = ctx.message.document?.file_name || "file";
      storeNonText(ctx, `[Document: ${name}]`);
    });
    this.bot.on("message:sticker", (ctx) => {
      const emoji = ctx.message.sticker?.emoji || "";
      storeNonText(ctx, `[Sticker ${emoji}]`);
    });
    this.bot.on("message:location", (ctx) => storeNonText(ctx, "[Location]"));
    this.bot.on("message:contact", (ctx) => storeNonText(ctx, "[Contact]"));

    // Handle errors gracefully
    this.bot.catch((err) => {
      logger.error({ err: err.message }, "Telegram bot error");
    });

    // Start polling — returns a Promise that resolves when started
    return new Promise<void>((resolve) => {
      this.bot!.start({
        onStart: (botInfo) => {
          logger.info(
            { username: botInfo.username, id: botInfo.id },
            "Telegram bot connected",
          );
          console.log(`\n  Telegram bot: @${botInfo.username}`);
          console.log(
            `  Send /chatid to the bot to get a chat's registration ID\n`,
          );
          resolve();
        },
      });
    });
  }

  /**
   * Split text into chunks that respect Markdown boundaries
   * Tries to split at newlines near the max length to avoid breaking formatting
   */
  private splitMessageSafely(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining);
        break;
      }

      // Try to find a good break point (newline) before maxLength
      let splitAt = maxLength;
      const searchStart = Math.max(0, maxLength - 200); // Look back up to 200 chars
      const lastNewline = remaining.lastIndexOf('\n', maxLength);

      if (lastNewline > searchStart) {
        // Found a good newline break point
        splitAt = lastNewline + 1;
      } else {
        // No good newline, try to break at a space
        const lastSpace = remaining.lastIndexOf(' ', maxLength);
        if (lastSpace > searchStart) {
          splitAt = lastSpace + 1;
        }
      }

      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt);
    }

    return chunks;
  }

  /**
   * Send a message with Markdown parsing, falling back to plain text if parsing fails
   */
  private async sendWithMarkdown(chatId: string, text: string): Promise<void> {
    try {
      await this.bot!.api.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch (err: any) {
      // If Markdown parsing failed, try again with plain text
      if (err?.description?.includes("can't parse") || err?.description?.includes("parse entities")) {
        logger.warn({ chatId, error: err.description }, "Markdown parse failed, sending as plain text");
        await this.bot!.api.sendMessage(chatId, text);
      } else {
        // Some other error, re-throw
        throw err;
      }
    }
  }

  async sendMessage(jid: string, text: string): Promise<void> {
    if (!this.bot) {
      logger.warn("Telegram bot not initialized");
      return;
    }

    try {
      const numericId = jid.replace(/^tg:/, "");

      // Telegram has a 4096 character limit per message — split if needed
      const MAX_LENGTH = 4096;
      const chunks = this.splitMessageSafely(text, MAX_LENGTH);

      for (const chunk of chunks) {
        await this.sendWithMarkdown(numericId, chunk);
      }

      logger.info({ jid, length: text.length, chunks: chunks.length }, "Telegram message sent");
    } catch (err) {
      logger.error({ jid, err }, "Failed to send Telegram message");
    }
  }

  isConnected(): boolean {
    return this.bot !== null;
  }

  ownsJid(jid: string): boolean {
    return jid.startsWith("tg:");
  }

  async disconnect(): Promise<void> {
    if (this.bot) {
      this.bot.stop();
      this.bot = null;
      logger.info("Telegram bot stopped");
    }
  }

  async setTyping(jid: string, isTyping: boolean): Promise<void> {
    if (!this.bot || !isTyping) return;
    try {
      const numericId = jid.replace(/^tg:/, "");
      await this.bot.api.sendChatAction(numericId, "typing");
    } catch (err) {
      logger.debug({ jid, err }, "Failed to send Telegram typing indicator");
    }
  }
}
