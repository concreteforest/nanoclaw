---
name: add-ontology-memory
description: Integrates a typed Knowledge Graph ontology database via SQLite, allowing the agent to dynamically build and query relational entities instead of just reading flat unstructured chat states.
---

# Add Ontology Memory Skill

This skill replaces flat file memory with a structured, graph-like relational memory inside the local SQLite database. 

## Objectives
1. Expose `create_entity`, `link_entities`, and `query_ontology` tools to the agent.
2. Store relationships and entity attributes in `store/messages.db`.

## Implementation Instructions

Provide these instructions to Claude Code to apply the skill:

### Step 1: Update Database Schema
In `src/db.ts`, add the `entities` and `relations` tables to the `createSchema` function:
\`\`\`sql
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      attributes TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES entities (id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES entities (id) ON DELETE CASCADE
    );
\`\`\`
*(Make sure you also `export let db: Database.Database;` so the new memory system can attach to it!)*

### Step 2: Implement Memory Accessors
Create a new file `src/memory.ts` and export the methods `createEntity()`, `linkEntities()`, and `queryOntology()` using `better-sqlite3`. Ensure FTS queries or simple `LIKE` searches evaluate across entity attributes.

### Step 3: Serve the SQLite Tools via MCP IPC
NanoClaw's container runner has an MCP interface. Update `container/agent-runner/src/ipc-mcp-stdio.ts` to register the three new tools (`create_entity`, `link_entities`, `query_ontology`). Have them write tasks to `TASKS_DIR`. 
For `query_ontology`, poll the `IPC_DIR/responses` directory until the host sends back the results.

### Step 4: Add Action Dispatchers on the Host
In `src/ipc.ts`, intercept the three new payload types inside the massive switch block in `processTaskIpc()`. For `query_ontology`, require the `src/memory.js` package dynamically, execute a search, stringify to JSON, and write to `ipcBaseDir/responses/query_ontology_<timestamp>.json` so the polling container resolves its request.
