//routes/courseRoutes.js

import express from 'express';
import {
  createCourse, getAllCourses, getCourseById,
  updateCourse, deleteCourse, approveCourse,rejectCourse
} from '../controllers/courseController.js';
import { 
  authenticateToken, 
  authorizeRoles,
  checkCourseOwnership // سنضيف هذا middleware جديد
} from '../middleware/authMiddleware.js';

const router = express.Router();

// إضافة كورس جديد — مدرس فقط
router.post('/', authenticateToken, authorizeRoles('instructor'), createCourse);

// عرض كل الكورسات (أي أحد)
router.get('/', getAllCourses);

// عرض تفاصيل كورس
router.get('/:id', getCourseById);

// تعديل كورس — مدرس صاحب الكورس أو أدمن
router.patch('/:id', authenticateToken, checkCourseOwnership, updateCourse);

// حذف كورس — مدرس صاحب الكورس أو أدمن
router.delete('/:id', authenticateToken, deleteCourse);
// موافقة الأدمن على كورس
// Approve/Reject course (Admin only)
router.put('/:id/approve', authenticateToken, authorizeRoles('admin'), approveCourse);
router.put('/:id/reject', authenticateToken, authorizeRoles('admin'), rejectCourse);
export default router;  