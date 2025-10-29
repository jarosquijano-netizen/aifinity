import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to AiFinity.app PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ AiFinity.app database error:', err);
  process.exit(-1);
});

export default pool;


