// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const authenticateToken = (req, res, next) => {
  // جلب التوكن من كل مكان ممكن
  let token = null;
  // 1. Authorization Header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. x-auth-token Header (اختياري)
  else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }
  // 3. Cookie (يحتاج cookie-parser مفعّل)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 4. body (إذا فيه token)
  else if (req.body && req.body.token) {
    token = req.body.token;
  }
  // 5. query string (اختياري)
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
    res.status(401).json({ error: 'Invalid token' });
  }
};

// 🔐 التحقق من الدور
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// التحقق من ملكية الكورس
export const checkCourseOwnership = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // الأدمن يمكنه تعديل أي كورس
    if (userRole === 'admin') {
      return next();
    }

    // التحقق من ملكية الكورس
    const result = await pool.query(
      'SELECT instructor_id FROM courses WHERE id = $1',
      [courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = result.rows[0];
    
    // التحقق أن المستخدم هو صاحب الكورس
    if (course.instructor_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to modify this course' });
    }

    next();
  } catch (err) {
    console.error('❌ Course ownership check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
