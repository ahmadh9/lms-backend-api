// routes/moduleRoutes.js
import express from 'express';
import {
  createModule,
  getCourseModules,
  updateModule,
  deleteModule
} from '../controllers/moduleController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// عرض وحدات كورس معين
router.get('/course/:courseId', getCourseModules);

// إضافة وحدة (مدرس)
router.post('/course/:courseId', authenticateToken, authorizeRoles('instructor'), createModule);

// تحديث وحدة (مدرس أو أدمن)
router.put('/:moduleId', authenticateToken, updateModule);

// حذف وحدة (مدرس أو أدمن)
router.delete('/:moduleId', authenticateToken, deleteModule);

export default router;