import { Pool, type QueryConfigValues } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pooling best practices 
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const database = {
  query: (text: string, params?: QueryConfigValues<unknown[]>) => pool.query(text, params),
  getClient: async () => {
    const client = await pool.connect();
    const query = (text: string, params?: QueryConfigValues<unknown[]>) => client.query(text, params);
    const release = () => client.release();
    return { query, release };
  },
};

export default database;
