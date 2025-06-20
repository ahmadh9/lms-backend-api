// controllers/fileController.js
import pool from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';

// رفع صورة المستخدم
export const uploadUserAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // حفظ مسار الصورة في قاعدة البيانات
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    
    // حذف الصورة القديمة إن وجدت
    const oldAvatar = await pool.query(
      'SELECT avatar FROM users WHERE id = $1',
      [userId]
    );
    
    if (oldAvatar.rows[0].avatar && oldAvatar.rows[0].avatar.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), oldAvatar.rows[0].avatar);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        console.log('Could not delete old avatar:', err);
      }
    }

    // تحديث قاعدة البيانات
    const result = await pool.query(
      'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING id, name, email, avatar',
      [avatarUrl, userId]
    );

    res.json({
      message: '✅ Avatar uploaded successfully',
      user: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Upload avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// رفع صورة الكورس
export const uploadCourseThumbnailFile = async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // التحقق من ملكية الكورس
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
      [courseId, instructorId]
    );

    if (courseCheck.rows.length === 0) {
      // حذف الملف المرفوع
      await fs.unlink(file.path);
      return res.status(403).json({ error: 'Not authorized to update this course' });
    }

    // حفظ مسار الصورة
    const thumbnailUrl = `/uploads/thumbnails/${file.filename}`;
    
    // حذف الصورة القديمة إن وجدت
    if (courseCheck.rows[0].thumbnail && courseCheck.rows[0].thumbnail.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), courseCheck.rows[0].thumbnail);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        console.log('Could not delete old thumbnail:', err);
      }
    }

    // تحديث قاعدة البيانات
    const result = await pool.query(
      'UPDATE courses SET thumbnail = $1 WHERE id = $2 RETURNING *',
      [thumbnailUrl, courseId]
    );

    res.json({
      message: '✅ Course thumbnail uploaded successfully',
      course: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Upload thumbnail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// رفع ملف الواجب
export const uploadAssignmentFile = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.id;

    const file = req.files?.assignmentFile?.[0] || null;
    const submission_text = req.body.submission_text?.trim() || null;

    if (!submission_text && !file) {
      return res.status(400).json({ error: 'Submission text or file is required' });
    }

    const assignmentCheck = await pool.query(
      'SELECT * FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (assignmentCheck.rows.length === 0) {
      if (file) await fs.unlink(file.path);
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const enrollmentCheck = await pool.query(
      `SELECT e.* FROM enrollments e
       JOIN modules m ON m.course_id = e.course_id
       JOIN lessons l ON l.module_id = m.id
       JOIN assignments a ON a.lesson_id = l.id
       WHERE a.id = $1 AND e.user_id = $2`,
      [assignmentId, studentId]
    );
    if (enrollmentCheck.rows.length === 0) {
      if (file) await fs.unlink(file.path);
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const existingSubmission = await pool.query(
      'SELECT 1 FROM submissions WHERE assignment_id = $1 AND user_id = $2',
      [assignmentId, studentId]
    );
    if (existingSubmission.rows.length > 0) {
      if (file) await fs.unlink(file.path);
      return res.status(400).json({ error: 'Assignment already submitted' });
    }

    const fileUrl = file ? `/uploads/assignments/${file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, user_id, submission_url, submission_text, submitted_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [assignmentId, studentId, fileUrl, submission_text]
    );

    res.status(201).json({
      message: '✅ Assignment submitted successfully',
      submission: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Upload assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
export const uploadLessonVideoFile = async (req, res) => {
  try {
    const file = req.file; // هذا اللي نحاول نرفعه
    if (!file) return res.status(400).json({ error: 'No video uploaded' });

    const videoUrl = `/uploads/videos/${file.filename}`;
    res.status(200).json({ message: '✅ Video uploaded', url: videoUrl });
  } catch (err) {
    console.error('❌ Upload lesson video error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};



// تحميل ملف
export const downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const { type } = req.query; // avatars, assignments, thumbnails
    
    if (!type || !['avatars', 'assignments', 'thumbnails'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(process.cwd(), 'uploads', type, filename);
    
    // التحقق من وجود الملف
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    // للواجبات، تحقق من الصلاحيات
    if (type === 'assignments') {
      const userId = req.user.id;
      const role = req.user.role;
      
      // البحث عن التسليم
      const submission = await pool.query(
        `SELECT s.*, a.*, c.instructor_id
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN lessons l ON a.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         JOIN courses c ON m.course_id = c.id
         WHERE s.submission_url LIKE $1`,
        [`%${filename}%`]
      );

      if (submission.rows.length === 0) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      const sub = submission.rows[0];
      
      // التحقق من الصلاحيات
      const canDownload = 
        userId === sub.user_id || // صاحب التسليم
        userId === sub.instructor_id || // مدرس الكورس
        role === 'admin'; // أدمن
      
      if (!canDownload) {
        return res.status(403).json({ error: 'Not authorized to download this file' });
      }
    }

    // إرسال الملف
    res.download(filePath);

  } catch (err) {
    console.error('❌ Download file error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};