// routes/quizRoutes.js
import express from 'express';
import {
  createQuiz,
  getLessonQuiz,
  submitQuiz,
  updateQuizQuestion,
  deleteQuizQuestion,
  getCourseQuizzes,
  getQuizAttemptsForLesson
} from '../controllers/quizController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// إنشاء اختبار (مدرس)
router.post(
  '/lesson/:lessonId',
  authenticateToken,
  authorizeRoles('instructor'),
  createQuiz
);

// الحصول على اختبار الدرس
router.get(
  '/lesson/:lessonId',
  authenticateToken,
  getLessonQuiz
);

// تسليم الاختبار (طالب)
router.post(
  '/lesson/:lessonId/submit',
  authenticateToken,
  authorizeRoles('student'),
  submitQuiz
);

// تحديث سؤال (مدرس أو أدمن)
router.put(
  '/question/:questionId',
  authenticateToken,
  authorizeRoles('instructor', 'admin'),
  updateQuizQuestion
);

// حذف سؤال (مدرس أو أدمن)
router.delete(
  '/question/:questionId',
  authenticateToken,
  authorizeRoles('instructor', 'admin'),
  deleteQuizQuestion
);

// GET جميع الاختبارات في الكورس (طالب)
router.get(
  '/course/:courseId',
  authenticateToken,
  authorizeRoles('student'),
  getCourseQuizzes
);
// ...
router.get(
  '/lesson/:lessonId/attempts',
  authenticateToken,
  authorizeRoles('instructor', 'admin'),
  getQuizAttemptsForLesson
);
export default router;
