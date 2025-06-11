// routes/analyticsRoutes.js
import express from 'express';
import {
  getDashboard,
  getStudentPerformance,
  getCourseStatistics,
  getInstructorCourses
} from '../controllers/analyticsController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', authenticateToken, getDashboard);
router.get('/student/:studentId/performance', authenticateToken, getStudentPerformance);
router.get('/course/:courseId/statistics', authenticateToken, getCourseStatistics);
router.get('/instructor/:instructorId/courses', authenticateToken, getInstructorCourses);

export default router;