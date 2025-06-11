// controllers/userController.js
import pool from '../config/db.js';

// ✅ دالة GET (موجودة من قبل)
export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users WHERE is_active = true');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ دالة POST (أضفها الآن)
export const createUser = async (req, res) => {
  const { name, email, password_hash, role, oauth_provider, oauth_id } = req.body;

  try {
    const query = `
      INSERT INTO users (name, email, password_hash, role, oauth_provider, oauth_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role
    `;

    const values = [name, email, password_hash, role, oauth_provider, oauth_id];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating user:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
