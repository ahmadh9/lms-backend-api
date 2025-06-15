// routes/userRoutes.js
import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { rejectCourse, approveCourse } from '../controllers/courseController.js';

const router = express.Router();

// [1] عرض كل المستخدمين (admin فقط)
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
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
    // تحقق من أن المستخدم ليس أدمن
    const userCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [id]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userCheck.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
    // حذف المستخدم - CASCADE سيحذف كل البيانات المرتبطة
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [id]
    );
    
    res.json({ 
      success: true, 
      message: 'User and all related data deleted successfully',
      deletedUser: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// مسارات الكورسات للأدمن
router.get('/courses', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.name as instructor_name, cat.name as category_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.created_at DESC
    `);
    
    res.json({
      courses: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// موافقة على كورس

// حذف كورس
router.delete('/courses/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM courses WHERE id = $1', [id]);
    res.json({ message: '✅ Course deleted successfully' });
  } catch (err) {
    console.error('❌ Delete course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;