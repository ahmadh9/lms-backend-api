import pool from '../config/db.js';

// إنشاء واجب جديد
export const createAssignment = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description, deadline } = req.body;
    const instructorId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // التحقق من ملكية الدرس
    const lessonCheck = await pool.query(
      `SELECT c.instructor_id
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (lessonCheck.rows[0].instructor_id !== instructorId) {
      return res.status(403).json({ error: 'Not authorized to add assignment to this lesson' });
    }

    // التأكد أنه ما في assignment سابق لنفس الدرس
    const existing = await pool.query(
      'SELECT 1 FROM assignments WHERE lesson_id = $1',
      [lessonId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Assignment already exists for this lesson' });
    }

    const insert = await pool.query(
      `INSERT INTO assignments
         (lesson_id, title, description, deadline)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [lessonId, title, description, deadline || null]
    );

    res.status(201).json({
      message: '✅ Assignment created successfully',
      assignment: insert.rows[0]
    });
  } catch (err) {
    console.error('❌ Create assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// جلب واجب الدرس مع حالة الطالب
export const getLessonAssignment = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;

    const asgRes = await pool.query(
      'SELECT * FROM assignments WHERE lesson_id = $1',
      [lessonId]
    );
    if (asgRes.rows.length === 0) {
      return res.status(404).json({ error: 'No assignment found for this lesson' });
    }
    const assignment = asgRes.rows[0];

    if (userId && req.user.role === 'student') {
      const enroll = await pool.query(
        `SELECT 1
         FROM enrollments e
         JOIN modules m ON e.course_id = m.course_id
         JOIN lessons l ON l.module_id = m.id
         WHERE l.id = $1 AND e.user_id = $2`,
        [lessonId, userId]
      );
      if (enroll.rows.length === 0) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }

      const subRes = await pool.query(
        'SELECT * FROM submissions WHERE assignment_id = $1 AND user_id = $2',
        [assignment.id, userId]
      );
      return res.json({
        message: '✅ Assignment fetched',
        assignment,
        submission: subRes.rows[0] || null
      });
    }

    // للمدرس أو الأدمن
    res.json({
      message: '✅ Assignment fetched',
      assignment
    });
  } catch (err) {
    console.error('❌ Get assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تسليم الواجب (يدعم نصّ، URL، أو ملف)
export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.id;

    // multer يحطّ الملف هنا
    const file = req.file;
    // لو req.body undefined نستخدم {} فارغ
    const { submission_url = null, submission_text = null } = req.body || {};

    if (!submission_url && !submission_text && !file) {
      return res.status(400).json({ error: 'Submission URL, text or file is required' });
    }

    // تحقق من وجود الواجب
    const asgCheck = await pool.query(
      'SELECT * FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (asgCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const assignment = asgCheck.rows[0];

    // تحقق من الموعد النهائي
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
      return res.status(400).json({ error: 'Assignment deadline has passed' });
    }

    // تحقق من تسجيل الطالب
    const enroll = await pool.query(
      `SELECT 1
       FROM enrollments e
       JOIN modules m ON e.course_id = m.course_id
       JOIN lessons l ON l.module_id = m.id
       JOIN assignments a ON a.lesson_id = l.id
       WHERE a.id = $1 AND e.user_id = $2`,
      [assignmentId, studentId]
    );
    if (enroll.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // تأكد أنه ما في تسليم سابق
    const existSub = await pool.query(
      'SELECT 1 FROM submissions WHERE assignment_id = $1 AND user_id = $2',
      [assignmentId, studentId]
    );
    if (existSub.rows.length > 0) {
      return res.status(400).json({ error: 'Assignment already submitted' });
    }

    // بناء URL للملف لو اتحمل
    const fileUrl = file ? `/uploads/${file.filename}` : null;

    const ins = await pool.query(
      `INSERT INTO submissions
         (assignment_id, user_id, submission_url, submission_text, submission_file_url, submitted_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [
        assignmentId,
        studentId,
        submission_url,
        submission_text,
        fileUrl
      ]
    );

    res.status(201).json({
      message: '✅ Assignment submitted successfully',
      submission: ins.rows[0]
    });
  } catch (err) {
    console.error('❌ Submit assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تقييم الواجب (مدرس)
export const gradeAssignment = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const instructorId = req.user.id;

    if (grade == null || grade < 0 || grade > 100) {
      return res.status(400).json({ error: 'Grade must be between 0 and 100' });
    }

    const chk = await pool.query(
      `SELECT c.instructor_id
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN lessons l       ON a.lesson_id    = l.id
       JOIN modules m       ON l.module_id    = m.id
       JOIN courses c       ON m.course_id    = c.id
       WHERE s.id = $1`,
      [submissionId]
    );
    if (chk.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (chk.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to grade this submission' });
    }

    const upd = await pool.query(
      `UPDATE submissions
         SET grade = $1, feedback = $2, graded_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [grade, feedback || null, submissionId]
    );

    res.json({
      message: '✅ Assignment graded successfully',
      submission: upd.rows[0]
    });
  } catch (err) {
    console.error('❌ Grade assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض تسليمات الواجب (مدرس)
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const instructorId = req.user.id;

    const chk = await pool.query(
      `SELECT c.instructor_id
       FROM assignments a
       JOIN lessons l   ON a.lesson_id = l.id
       JOIN modules m   ON l.module_id = m.id
       JOIN courses c   ON m.course_id = c.id
       WHERE a.id = $1`,
      [assignmentId]
    );
    if (chk.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (chk.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view these submissions' });
    }

    const subs = await pool.query(
      `SELECT
         s.*,
         u.name  AS student_name,
         u.email AS student_email
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       WHERE s.assignment_id = $1
       ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );

    res.json({ submissions: subs.rows });
  } catch (err) {
    console.error('❌ Get submissions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
export const deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const instructorId = req.user.id;

    // تأكد إن الواجب موجود وللمدرس نفسه
    const asgRes = await pool.query(
      `SELECT c.instructor_id
         FROM assignments a
         JOIN lessons l ON a.lesson_id = l.id
         JOIN modules m ON l.module_id = m.id
         JOIN courses c ON m.course_id = c.id
        WHERE a.id = $1`,
      [assignmentId]
    );
    if (asgRes.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    if (asgRes.rows[0].instructor_id !== instructorId) {
      return res.status(403).json({ error: 'Not authorized to delete this assignment' });
    }

    await pool.query('DELETE FROM assignments WHERE id = $1', [assignmentId]);
    res.json({ message: '✅ Assignment deleted successfully' });
  } catch (err) {
    console.error('❌ Delete assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
