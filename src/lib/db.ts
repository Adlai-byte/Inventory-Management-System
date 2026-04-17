import mysql from "mysql2/promise";

const QUERY_TIMEOUT_MS = 30000;

const dbName = process.env.MYSQL_DATABASE;
if (!dbName && process.env.NODE_ENV === "production") {
  throw new Error("MYSQL_DATABASE environment variable is required in production");
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: dbName || "bmm_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,
});

export type SqlValue = string | number | boolean | null | Date;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function query<T = unknown>(
  sql: string,
  params?: SqlValue[]
): Promise<T[]> {
  const [rows] = await withTimeout(pool.execute(sql, params), QUERY_TIMEOUT_MS);
  return rows as T[];
}

// Non-prepared query for more lenient parameter handling (e.g. LIMIT/OFFSET)
export async function simpleQuery<T = unknown>(
  sql: string,
  params?: SqlValue[]
): Promise<T[]> {
  const [rows] = await withTimeout(pool.query(sql, params), QUERY_TIMEOUT_MS);
  return rows as T[];
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: SqlValue[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

export async function execute(
  sql: string,
  params?: SqlValue[]
): Promise<mysql.ResultSetHeader> {
  const [result] = await withTimeout(pool.execute(sql, params), QUERY_TIMEOUT_MS);
  return result as mysql.ResultSetHeader;
}

export async function withTransaction<T>(
  operation: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
