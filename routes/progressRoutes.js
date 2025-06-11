// routes/progressRoutes.js
import express from 'express';
import {
  getCourseProgress,
  getModuleProgress,
  markLessonComplete
} from '../controllers/progressController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/course/:courseId', authenticateToken, getCourseProgress);
router.get('/module/:moduleId', authenticateToken, getModuleProgress);
router.post('/lesson/:lessonId/complete', authenticateToken, markLessonComplete);

export default router;