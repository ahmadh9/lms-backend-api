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