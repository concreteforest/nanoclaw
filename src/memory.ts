import { db } from './db.js';

export interface Entity {
    id: string;
    type: string;
    name: string;
    attributes: Record<string, any>;
    created_at: string;
}

export interface Relation {
    id?: number;
    source_id: string;
    target_id: string;
    relation_type: string;
    metadata: Record<string, any>;
    created_at: string;
}

export function createEntity(id: string, type: string, name: string, attributes: Record<string, any> = {}): void {
    const now = new Date().toISOString();
    db.prepare(
        `INSERT OR REPLACE INTO entities (id, type, name, attributes, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(id, type, name, JSON.stringify(attributes), now);
}

export function linkEntities(source_id: string, target_id: string, relation_type: string, metadata: Record<string, any> = {}): void {
    const now = new Date().toISOString();
    db.prepare(
        `INSERT INTO relations (source_id, target_id, relation_type, metadata, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(source_id, target_id, relation_type, JSON.stringify(metadata), now);
}

export function queryOntology(query: string): any[] {
    // Simple FTS query on entities
    return db.prepare(
        `SELECT e.*, 
       (SELECT json_group_array(json_object('target_id', target_id, 'relation_type', relation_type)) FROM relations WHERE source_id = e.id) as out_relations,
       (SELECT json_group_array(json_object('source_id', source_id, 'relation_type', relation_type)) FROM relations WHERE target_id = e.id) as in_relations
     FROM entities e WHERE e.name LIKE ? OR e.attributes LIKE ? OR e.type LIKE ? LIMIT 50`
    ).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
}
