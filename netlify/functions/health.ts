import type { Handler } from "@netlify/functions";
import { getDb } from "./_db";

export const handler: Handler = async () => {
  try {
    const db = getDb();
    await db.query("select 1 as ok");

    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: e?.message || "db_error" }),
    };
  }
};
