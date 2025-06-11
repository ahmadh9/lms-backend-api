import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// [1] عرض كل المستخدمين (admin فقط)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar, is_active, created_at FROM users ORDER BY id'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('❌ Users fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// [2] عرض مستخدم معيّن (admin فقط)
router.get('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, avatar, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('❌ User fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// [3] تعديل بيانات مستخدم (admin فقط)
router.patch('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, avatar, role, is_active } = req.body;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users SET
        name = COALESCE($1, name),
        avatar = COALESCE($2, avatar),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, name, email, role, avatar, is_active, updated_at`,
      [name, avatar, role, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      message: '✅ User updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// [4] حذف مستخدم (admin فقط)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: '✅ User deleted successfully' });
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
