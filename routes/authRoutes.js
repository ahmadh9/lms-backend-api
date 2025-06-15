import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// تسجيل دخول Google OAuth (نفس الكود الموجود)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


// تعديل Google callback في authRoutes.js
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // حفظ التوكن والمستخدم في session أو cookie
    req.session.token = token;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };

    // Redirect للـ frontend بدل إرجاع JSON
    res.redirect('http://localhost:3000?googleLogin=success');
  }
);

// إضافة endpoint للحصول على session
router.get('/session', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      authenticated: true,
      token: req.session.token,
      user: req.session.user
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});
// تسجيل يدوي محدّث مع bcrypt
router.post('/register', async (req, res) => {
  const { name, email, password, avatar } = req.body;

  try {
    // التحقق من المدخلات
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // التحقق من طول كلمة المرور
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // تحقق إذا المستخدم موجود
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // تشفير كلمة المرور
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, avatar, oauth_provider)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, avatar`,
      [name, email, password_hash, 'student', avatar || null, 'local']
    );

    // توليد JWT بعد التسجيل مباشرة
    const user = result.rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '✅ Registered successfully',
      token,
      user
    });

  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// تسجيل دخول محدّث مع bcrypt
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // التحقق من المدخلات
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // جلب المستخدم
    const userRes = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND oauth_provider = $2',
      [email, 'local']
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // التحقق من كلمة المرور المشفرة
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // توليد JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '✅ Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// تسجيل خروج
router.post('/logout', (req, res) => {
  // مع JWT، التسجيل الخروج يتم من جهة العميل بحذف التوكن
  // لكن يمكننا إضافة التوكن لـ blacklist إذا أردنا
  res.json({ message: '✅ Logged out successfully' });
});
// الملف الشخصي
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await pool.query(
      'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: '✅ Profile fetched',
      user: user.rows[0]
    });
  } catch (err) {
    console.error('❌ Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// تحديث الملف الشخصي
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, avatar } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           avatar = COALESCE($2, avatar)
       WHERE id = $3
       RETURNING id, name, email, role, avatar`,
      [name, avatar, userId]
    );

    res.json({
      message: '✅ Profile updated',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
export default router;