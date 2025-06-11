// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // نضيف بيانات المستخدم إلى الطلب
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token.' });
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
