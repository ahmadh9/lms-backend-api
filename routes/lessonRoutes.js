// routes/lessonRoutes.js
import express from 'express';
import {
  createLesson,
  getModuleLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
  markLessonComplete
} from '../controllers/lessonController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// عرض دروس وحدة معينة
router.get('/module/:moduleId', getModuleLessons);

// عرض درس واحد
router.get('/:lessonId', authenticateToken, getLessonById);

// إضافة درس (مدرس)
router.post('/module/:moduleId', authenticateToken, authorizeRoles('instructor'), createLesson);

// تحديث درس (مدرس أو أدمن)
router.put('/:lessonId', authenticateToken, updateLesson);

// حذف درس (مدرس أو أدمن)
router.delete('/:lessonId', authenticateToken, deleteLesson);

// تسجيل إكمال الدرس (طالب)
router.post('/:lessonId/complete', authenticateToken, authorizeRoles('student'), markLessonComplete);

export default router;