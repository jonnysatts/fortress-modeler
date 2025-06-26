import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

// Database connection pool
let pool: Pool | null = null;

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number; // Max connections in pool
}

// Initialize database connection
export function initializeDatabase(config?: DatabaseConfig): Pool {
  if (pool) {
    return pool;
  }

  let dbConfig: DatabaseConfig;

  // Production environment (Google Cloud Run with Cloud SQL)
  if (process.env.NODE_ENV === 'production' && process.env.CLOUD_SQL_CONNECTION_NAME) {
    console.log('🚀 Initializing database for production (Cloud SQL)');
    dbConfig = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`, // Use Unix socket
      max: 20,
    };
  } 
  // Development environment (local with DATABASE_URL)
  else if (process.env.DATABASE_URL) {
    console.log('🚀 Initializing database for development (DATABASE_URL)');
    dbConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      ssl: false, // Assuming local dev doesn't use SSL
    };
  }
  // Fallback or custom config
  else {
    console.log('🚀 Initializing database with custom or default config');
    dbConfig = config || {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'fortress-modeler',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      max: 20,
    };
  }

  pool = new Pool(dbConfig as any);
  
  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  console.log('✅ Database connection pool initialized');
  return pool;
}

// Get database connection
export function getDatabase(): Pool {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

// Test database connection
export async function testConnection(): Promise<{ success: boolean; error?: string; latency?: number }> {
  try {
    const start = Date.now();
    const db = getDatabase();
    const result = await db.query('SELECT NOW() as current_time, version() as version');
    const latency = Date.now() - start;
    
    return {
      success: true,
      latency,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// Run database migrations/schema
export async function runMigrations(): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDatabase();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema in a transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(schemaSql);
      await client.query('COMMIT');
      console.log('✅ Database schema applied successfully');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown migration error';
    console.error('❌ Database migration failed:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Query helper with error handling
export async function query(text: string, params?: any[]): Promise<any> {
  const db = getDatabase();
  try {
    const start = Date.now();
    const result = await db.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Query executed in ${duration}ms:`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Close database connection (for graceful shutdown)
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection pool closed');
  }
}

// Health check for database
export async function getDatabaseHealth(): Promise<{
  status: string;
  latency?: number;
  connections?: {
    total: number;
    idle: number;
    waiting: number;
  };
  error?: string;
}> {
  try {
    const connectionTest = await testConnection();
    
    if (!connectionTest.success) {
      return {
        status: 'unhealthy',
        error: connectionTest.error,
      };
    }

    const db = getDatabase();
    return {
      status: 'healthy',
      latency: connectionTest.latency,
      connections: {
        total: db.totalCount,
        idle: db.idleCount,
        waiting: db.waitingCount,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}