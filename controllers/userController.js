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


// في ملف userController.js أو admin routes
// بعد تطبيق CASCADE DELETE، الكود يصبح بسيط جداً

const deleteUser = async (req, res) => {
  const userId = req.params.id;
  
  try {
    // فقط احذف المستخدم، CASCADE سيتولى الباقي
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING *',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User and all related data deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
// في ملف adminRoutes.js أو userController.js

// دالة حذف المستخدم للأدمن
export const deleteUserByAdmin = async (req, res) => {
  const userId = req.params.id;
  
  try {
    // تحقق من أن المستخدم ليس أدمن
    const userCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
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
      [userId]
    );
    
    res.json({ 
      success: true, 
      message: 'User and all related data deleted successfully',
      deletedUser: result.rows[0]
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// في adminRoutes.js
router.delete('/users/:id', authenticateAdmin, deleteUserByAdmin);