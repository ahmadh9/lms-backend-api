// routes/assignmentRoutes.js
import express from 'express';
import {
  createAssignment,
  getLessonAssignment,
  submitAssignment,
  gradeAssignment,
  getAssignmentSubmissions
} from '../controllers/assignmentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// إنشاء واجب (مدرس)
router.post('/lesson/:lessonId', authenticateToken, authorizeRoles('instructor'), createAssignment);

// الحصول على واجب الدرس
router.get('/lesson/:lessonId', authenticateToken, getLessonAssignment);

// تسليم الواجب (طالب)
router.post('/:assignmentId/submit', authenticateToken, authorizeRoles('student'), submitAssignment);

// تقييم الواجب (مدرس)
router.put('/submission/:submissionId/grade', authenticateToken, gradeAssignment);

// عرض تسليمات الواجب (مدرس)
router.get('/:assignmentId/submissions', authenticateToken, getAssignmentSubmissions);

export default router;