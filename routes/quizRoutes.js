// routes/quizRoutes.js
import express from 'express';
import {
  createQuiz,
  getLessonQuiz,
  submitQuiz,
  updateQuizQuestion,
  deleteQuizQuestion
} from '../controllers/quizController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// إنشاء اختبار (مدرس)
router.post('/lesson/:lessonId', authenticateToken, authorizeRoles('instructor'), createQuiz);

// الحصول على اختبار الدرس
router.get('/lesson/:lessonId', authenticateToken, getLessonQuiz);

// تسليم الاختبار (طالب)
router.post('/lesson/:lessonId/submit', authenticateToken, authorizeRoles('student'), submitQuiz);

// تحديث سؤال (مدرس أو أدمن)
router.put('/question/:questionId', authenticateToken, updateQuizQuestion);

// حذف سؤال (مدرس أو أدمن)
router.delete('/question/:questionId', authenticateToken, deleteQuizQuestion);

export default router;