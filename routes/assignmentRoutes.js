import express from 'express';
import pool from '../config/db.js';
import {
  createAssignment,
  getLessonAssignment,
  submitAssignment,
  gradeAssignment,
  getAssignmentSubmissions,
  deleteAssignment
} from '../controllers/assignmentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { uploadAssignment, handleUploadError } from '../middleware/fileUploadMiddleware.js';

const router = express.Router();


// إنشاء واجب (مدرس)
router.post(
  '/lesson/:lessonId',
  authenticateToken,
  authorizeRoles('instructor'),
  createAssignment
);

// الحصول على واجب الدرس
router.get(
  '/lesson/:lessonId',
  authenticateToken,
  getLessonAssignment
);

// تسليم الواجب (طالب)
router.post(
  '/:assignmentId/submit',
  authenticateToken,
  authorizeRoles('student'),
  uploadAssignment,
  handleUploadError,
  submitAssignment
);

// حذف الواجب (مدرس)
router.delete(
  '/:assignmentId',
  authenticateToken,
  authorizeRoles('instructor'),
  deleteAssignment
);

// تقييم الواجب (مدرس)
router.put(
  '/submission/:submissionId/grade',
  authenticateToken,
  gradeAssignment
);

// عرض تسليمات الواجب (مدرس)
router.get(
  '/:assignmentId/submissions',
  authenticateToken,
  getAssignmentSubmissions
);

// جلب كل الواجبات مع حالة التسليم للطالب
router.get(
  '/course/:courseId',
  authenticateToken,
  async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT
        a.id               AS assignment_id,
        a.lesson_id,
        a.title            AS assignment_title,
        a.description,
        a.deadline,
        l.title            AS lesson_title,
        m.id               AS module_id,
        m.title            AS module_title,
        s.id               AS submission_id,
        s.submitted_at,
        s.grade,
        s.feedback
      FROM assignments a
      JOIN lessons l   ON a.lesson_id   = l.id
      JOIN modules m   ON l.module_id    = m.id
      LEFT JOIN submissions s 
        ON s.assignment_id = a.id AND s.user_id = $2
      WHERE m.course_id = $1
      ORDER BY m."order", l."order"
    `, [courseId, userId]);
    res.json({ assignments: result.rows });
  }
);

export default router;
