// config/db.js
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  await pool.connect();
  console.log('Connected to PostgreSQL');
} catch (err) {
  console.error('Connection error:', err);
}

export default pool;
