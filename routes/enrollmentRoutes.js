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

const router = express.Router();

// تسجيل في كورس (طالب فقط)
router.post('/enroll', authenticateToken, enrollInCourse);

// عرض كورسات الطالب
router.get('/my-courses', authenticateToken, getMyEnrollments);

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