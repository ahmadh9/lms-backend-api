// middleware/authMiddleware.js

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../config/db.js';  // تأكد من مسار الاتصال بقاعدة البيانات

dotenv.config();

// 🛡️ التحقق من JWT بأي مكان ممكن
export const authenticateToken = (req, res, next) => {
  let token = null;

  // 1. Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. x-auth-token header
  else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }
  // 3. Cookie (requires cookie-parser)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 4. Body
  else if (req.body && req.body.token) {
    token = req.body.token;
  }
  // 5. Query string
  else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

// 🔐 التحقق من الأدوار المسموحة
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// 📝 التحقق من ملكية الكورس أو كونه أدمن
export const checkCourseOwnership = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId   = req.user.id;
    const role     = req.user.role;

    // الأدمن يمرر دائماً
    if (role === 'admin') {
      return next();
    }

    // جلب instructor_id من جدول courses
    const { rows } = await pool.query(
      'SELECT instructor_id FROM courses WHERE id = $1',
      [courseId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // ليس صاحب الكورس => ممنوع
    if (rows[0].instructor_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this course.' });
    }

    next();
  } catch (err) {
    console.error('❌ Course ownership check error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
};
