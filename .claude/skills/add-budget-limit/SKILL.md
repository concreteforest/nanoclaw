---
name: add-budget-limit
description: Adds a hard daily API spending ceiling that halts all agent execution until the next day if the limit is reached, preventing runaway costs.
---

# Add Budget Limit Skill

AI Agents, particularly in Swarms or autonomous loops, can accidentally accumulate massive API bills if they get stuck resetting each other or looping on errors. 

NanoClaw natively includes `src/cost-tracker.ts`, which logs how much each container run costs, but it currently only reports numbers—it doesn't enforce limits. This skill adds a hard kill-switch to enforce a `.env` budget ceiling.

## Implementation

Provide these instructions to the user/Claude Code:

### Step 1: Add Budget Limit Configuration

Modify `src/config.ts` to export a new budget variable based on `.env`:

```typescript
export const DAILY_BUDGET_USD = parseFloat(process.env.DAILY_BUDGET_USD || '1.50');
```

Update `/data/env/env` and `.env` to include:

```bash
DAILY_BUDGET_USD=2.00
```

### Step 2: Extract Current Daily Cost

Modify `src/cost-tracker.ts` to expose a function that sums up the cost for today.

```typescript
export function getDailyCostUSD(): number {
  if (!db) return 0;
  
  // Costs are stored internally as tenths of a cent (0.001 USD cents)
  // to avoid floating point math errors
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  const startTimestamp = today.toISOString();
  
  const query = `
    SELECT SUM(cost_tenth_cents) as total
    FROM container_runs
    WHERE start_time >= ?
  `;
  
  const row = db.prepare(query).get(startTimestamp) as { total: number | null };
  const costTenthCents = row?.total || 0;
  
  // Convert tenths of cents to whole USD
  return costTenthCents / (10 * 100); 
}
```

### Step 3: Implement Enforcement in Container Runner

Modify `src/container-runner.ts` to halt agent creation if the budget is blown. Find the `runContainerAgent` function and add this at the very top:

```typescript
import { getDailyCostUSD } from './cost-tracker.js';
import { DAILY_BUDGET_USD } from './config.js';

// ... inside runContainerAgent:

export async function runContainerAgent(
  group: RegisteredGroup,
  input: ContainerInput,
  onProcess: (proc: ChildProcess, containerName: string) => void,
  onOutput?: (output: ContainerOutput) => Promise<void>,
): Promise<ContainerOutput> {

  // ENFORCEMENT CHECK
  const currentCost = getDailyCostUSD();
  if (currentCost >= DAILY_BUDGET_USD) {
    logger.error(
      { group: group.name, currentCost, budget: DAILY_BUDGET_USD },
      'Agent blocked: Daily budget exceeded'
    );
    
    // Attempt to notify the user if streaming output is hooked up
    if (onOutput) {
      await onOutput({
        status: 'error',
        result: `System Alert: The daily budget of $${DAILY_BUDGET_USD} has been reached (Current cost: $${currentCost.toFixed(2)}). Agent execution is paused until tomorrow.`,
      });
    }

    return {
      status: 'error',
      result: null,
      error: `Blocked by budget limit (${currentCost} >= ${DAILY_BUDGET_USD})`
    };
  }

  // ... continue normal container execution
```

### Step 4: Rebuild and Restart

```bash
npm run build
# Restart service (e.g., systemctl --user restart nanoclaw)
```

## How It Works

Every time NanoClaw tries to spawn a container (whether from WhatsApp input, Telegram input, scheduled task, or swarm subprocess), it calls `runContainerAgent`. 
The `getDailyCostUSD()` strictly queries the SQLite DB for the total cost since midnight.
If the cost is higher than `DAILY_BUDGET_USD` (e.g. $2.00), it instantly aborts the deployment and returns a fake `error` response explaining why, completely protecting your API keys from runaway usage.
