// routes/enrollmentRoutes.js
import express from 'express';
import {
  enrollInCourse,
  getMyEnrollments,
  getCourseStudents,
  updateProgress,
  getEnrollmentStats
} from '../controllers/enrollmentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
// في enrollmentRoutes.js - استبدل الـ POST route بهذا:
import pool from '../config/db.js'; // أضف هذا في الأعلى
const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id; // من الـ token  
    const { course_id } = req.body;
    
    console.log('Enrollment request:', { user_id, course_id });
    
    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }
    
    // Check if already enrolled
    const checkQuery = `
      SELECT * FROM enrollments 
      WHERE user_id = $1 AND course_id = $2
    `;
    const existing = await pool.query(checkQuery, [user_id, course_id]);
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }
    
    // Create enrollment
    const insertQuery = `
      INSERT INTO enrollments (user_id, course_id, enrolled_at, progress) 
      VALUES ($1, $2, NOW(), 0) 
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [user_id, course_id]);
    
    console.log('Enrollment created:', result.rows[0]);
    res.json({ 
      success: true,
      message: 'Enrolled successfully', 
      enrollment: result.rows[0] 
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: error.message || 'Failed to enroll' });
  }
});


// جلب جميع التسجيلات (مع فلترة اختيارية)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.query;
    let query;
    let params = [];
    
    if (course_id) {
      // إذا كان هناك course_id، جلب طلاب هذا الكورس
      query = `
        SELECT 
          e.*,
          u.name as user_name,
          u.email as user_email
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        WHERE e.course_id = $1
        ORDER BY e.enrolled_at DESC
      `;
      params = [course_id];
    } else {
      // جلب جميع التسجيلات
      query = `
        SELECT * FROM enrollments 
        ORDER BY enrolled_at DESC
      `;
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});
// أضف هذا الـ route
router.get('/course/:courseId/students', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // للمدرس فقط: التحقق أنه صاحب الكورس
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query(
        'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
      
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }
    
    // جلب الطلاب المسجلين
    const students = await pool.query(
      `SELECT 
        e.id as enrollment_id,
        e.enrolled_at,
        e.progress,
        e.completed_at,
        u.id as student_id,
        u.name as student_name,
        u.email as student_email
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = $1
      ORDER BY e.enrolled_at DESC`,
      [courseId]
    );
    
    res.json({
      message: 'Students fetched',
      students: students.rows
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// أضف هذا الـ route
router.get('/course/:courseId/students', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // للمدرس فقط: التحقق أنه صاحب الكورس
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query(
        'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, userId]
      );
      
      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }
    
    // جلب الطلاب المسجلين
    const students = await pool.query(
      `SELECT 
        e.id as enrollment_id,
        e.enrolled_at,
        e.progress,
        e.completed_at,
        u.id as student_id,
        u.name as student_name,
        u.email as student_email
      FROM enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.course_id = $1
      ORDER BY e.enrolled_at DESC`,
      [courseId]
    );
    
    res.json({
      message: 'Students fetched',
      students: students.rows
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/course/:courseId/students', authenticateToken, getCourseStudents);
// عرض كورسات الطالب
router.get('/my-courses', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching enrollments for user:', userId);
    
    const query = `
      SELECT 
        e.id,
        e.user_id,
        e.course_id,
        e.enrolled_at,
        e.progress,
        c.title as course_title,
        c.description as course_description,
        c.price,
        u.name as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    console.log('Found enrollments:', result.rows.length);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// عرض طلاب كورس معين (مدرس أو أدمن)
router.get('/course/:courseId/students', 
  authenticateToken, 
  authorizeRoles('instructor', 'admin'), 
  getCourseStudents
);

// تحديث تقدم الطالب
router.put('/:id/progress', authenticateToken, updateProgress);

// إحصائيات التسجيل (أدمن فقط)
router.get('/stats', 
  authenticateToken, 
  authorizeRoles('admin'), 
  getEnrollmentStats
);

export default router;