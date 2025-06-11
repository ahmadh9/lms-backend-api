// routes/fileRoutes.js
import express from 'express';
import {
  uploadUserAvatar,
  uploadCourseThumbnailFile,
  uploadAssignmentFile,
  downloadFile
} from '../controllers/fileController.js';
import {
  uploadAvatar,
  uploadAssignment,
  uploadCourseThumbnail,
  handleUploadError
} from '../middleware/fileUploadMiddleware.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// رفع صورة المستخدم
router.post(
  '/avatar',
  authenticateToken,
  uploadAvatar,
  handleUploadError,
  uploadUserAvatar
);

// رفع صورة الكورس
router.post(
  '/course/:courseId/thumbnail',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadCourseThumbnail,
  handleUploadError,
  uploadCourseThumbnailFile
);

// رفع ملف الواجب
router.post(
  '/assignment/:assignmentId',
  authenticateToken,
  authorizeRoles('student'),
  uploadAssignment,
  handleUploadError,
  uploadAssignmentFile
);

// تحميل ملف
router.get(
  '/download/:filename',
  authenticateToken,
  downloadFile
);

export default router;