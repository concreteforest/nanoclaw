import { z } from 'zod';
import {
  getCostSummary,
  getDailyCosts,
  formatCostReport,
  logTokenUsage,
} from './cost-tracker.js';

export const costTrackingTools = {
  get_cost_summary: {
    description: `Get a summary of API costs and token usage over a time period.

Returns total costs, token counts, and breakdowns by group and model. Useful for tracking spending and understanding usage patterns.`,
    inputSchema: z.object({
      start_date: z
        .string()
        .optional()
        .describe('Start date in ISO format (e.g., "2026-02-01T00:00:00Z")'),
      end_date: z
        .string()
        .optional()
        .describe('End date in ISO format (e.g., "2026-02-18T23:59:59Z")'),
      group_folder: z
        .string()
        .optional()
        .describe('Filter by specific group folder (e.g., "main", "family-chat")'),
    }),
    handler: async (args: {
      start_date?: string;
      end_date?: string;
      group_folder?: string;
    }) => {
      const summary = getCostSummary(args.start_date, args.end_date, args.group_folder);
      const report = formatCostReport(summary);
      return { content: [{ type: 'text', text: report }] };
    },
  },

  get_daily_costs: {
    description: `Get daily cost breakdown for the last N days.

Shows costs per day to help identify usage trends and spikes. Default is last 30 days.`,
    inputSchema: z.object({
      days: z
        .number()
        .optional()
        .default(30)
        .describe('Number of days to include (default: 30)'),
    }),
    handler: async (args: { days?: number }) => {
      const dailyCosts = getDailyCosts(args.days || 30);

      let report = `*Daily Costs (Last ${args.days || 30} Days)*\n\n`;

      if (dailyCosts.length === 0) {
        report += 'No usage data found for this period.';
      } else {
        for (const day of dailyCosts) {
          report += `${day.date}: $${day.cost.toFixed(4)} (${day.requests} requests)\n`;
        }

        const totalCost = dailyCosts.reduce((sum, day) => sum + day.cost, 0);
        const totalRequests = dailyCosts.reduce((sum, day) => sum + day.requests, 0);
        const avgCostPerDay = totalCost / dailyCosts.length;

        report += `\n*Summary:*\n`;
        report += `• Total: $${totalCost.toFixed(4)}\n`;
        report += `• Avg/day: $${avgCostPerDay.toFixed(4)}\n`;
        report += `• Total requests: ${totalRequests}\n`;
      }

      return { content: [{ type: 'text', text: report }] };
    },
  },

  log_token_usage: {
    description: `Manually log token usage for cost tracking.

This is typically called automatically after API responses, but can be used to manually record usage.`,
    inputSchema: z.object({
      group_folder: z.string().describe('Group folder (e.g., "main")'),
      chat_jid: z.string().describe('Chat JID'),
      model: z.string().describe('Model name (e.g., "claude-3-5-sonnet-latest")'),
      input_tokens: z.number().describe('Number of input tokens used'),
      output_tokens: z.number().describe('Number of output tokens generated'),
      cache_write_tokens: z
        .number()
        .optional()
        .describe('Number of tokens written to cache'),
      cache_read_tokens: z
        .number()
        .optional()
        .describe('Number of tokens read from cache'),
      message_id: z.string().optional().describe('Associated message ID'),
    }),
    handler: async (args: {
      group_folder: string;
      chat_jid: string;
      model: string;
      input_tokens: number;
      output_tokens: number;
      cache_write_tokens?: number;
      cache_read_tokens?: number;
      message_id?: string;
    }) => {
      logTokenUsage(args);
      return {
        content: [
          {
            type: 'text',
            text: 'Token usage logged successfully.',
          },
        ],
      };
    },
  },
};
