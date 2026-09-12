import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error('DATABASE_URL is required');

const client = new Client({ connectionString });
await client.connect();

try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const directory = path.resolve('migrations');
  const files = (await fs.readdir(directory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
  for (const filename of files) {
    const applied = await client.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
    if (applied.rowCount) {
      console.log(`skip ${filename}`);
      continue;
    }
    console.log(`apply ${filename}`);
    const sql = await fs.readFile(path.join(directory, filename), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [filename]);
  }
} finally {
  await client.end();
}
