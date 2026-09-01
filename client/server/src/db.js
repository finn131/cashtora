import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // serverless-friendly short-lived idle
  max: 10,
  idleTimeoutMillis: 30000,
});

const als = new AsyncLocalStorage();

function currentClient() {
  return als.getStore() || null;
}

// translate sqlite `?` placeholders to pg `$1, $2, ...`
function rewrite(sql) {
  if (!sql.includes('?')) return sql;
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function execQuery(sql, params) {
  const client = currentClient();
  const target = client || pool;
  return target.query(rewrite(sql), params || []);
}

async function dbOne(sql, params) {
  const r = await execQuery(sql, params);
  return r.rows[0];
}

async function dbAll(sql, params) {
  const r = await execQuery(sql, params);
  return r.rows;
}

async function dbRun(sql, params) {
  const trimmed = sql.trimStart();
  let query = sql;
  if (/^insert into/i.test(trimmed) && !/returning/i.test(trimmed)) {
    query = trimmed.replace(/;?\s*$/, '') + ' RETURNING id';
  }
  const r = await execQuery(query, params || []);
  let lastInsertRowid = null;
  if (r.rows && r.rows[0] && r.rows[0].id !== undefined) {
    lastInsertRowid = r.rows[0].id;
  }
  const changes = r.rowCount ?? 0;
  return { lastInsertRowid, changes };
}

const db = {
  prepare(sql) {
    return {
      get: (...args) => dbOne(sql, args),
      all: (...args) => dbAll(sql, args),
      run: (...args) => dbRun(sql, args),
    };
  },
  exec(sql) {
    return execQuery(sql, []);
  },
  transaction,
};

// transaction: run callback with a pinned client so BEGIN/COMMIT stay on one conn
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return await als.run(client, async () => {
      try {
        const result = await fn();
        await client.query('COMMIT');
        return result;
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) {}
        throw e;
      }
    });
  } catch (e) {
    throw e;
  } finally {
    client.release();
  }
}

export default db;
