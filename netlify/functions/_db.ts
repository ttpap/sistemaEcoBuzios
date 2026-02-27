import { Pool } from "pg";

let pool: Pool | null = null;

export function getDb() {
  if (pool) return pool;

  const connectionString = process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    throw new Error("NETLIFY_DATABASE_URL não configurada no ambiente.");
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  return pool;
}
