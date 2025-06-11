// controllers/assignmentController.js
import pool from '../config/db.js';

// إنشاء واجب جديد
export const createAssignment = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description, deadline } = req.body;
    const instructorId = req.user.id;

    // التحقق من البيانات
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // التحقق من ملكية الدرس
    const lessonCheck = await pool.query(
      `SELECT l.*, c.instructor_id 
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

    // التحقق من عدم وجود واجب سابق للدرس
    const existingAssignment = await pool.query(
      'SELECT * FROM assignments WHERE lesson_id = $1',
      [lessonId]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'Assignment already exists for this lesson' });
    }

    const result = await pool.query(
      `INSERT INTO assignments (lesson_id, title, description, deadline)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [lessonId, title, description, deadline || null]
    );

    res.status(201).json({
      message: '✅ Assignment created successfully',
      assignment: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Create assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getLessonAssignment = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;

    // جلب الواجب أولاً
    const assignment = await pool.query(
      'SELECT * FROM assignments WHERE lesson_id = $1',
      [lessonId]
    );

    if (assignment.rows.length === 0) {
      return res.status(404).json({ error: 'No assignment found for this lesson' });
    }

    // التحقق من التسجيل (للطلاب فقط)
    if (userId && req.user.role === 'student') {
      const enrollmentCheck = await pool.query(
        `SELECT DISTINCT e.* 
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         JOIN modules m ON m.course_id = c.id
         JOIN lessons l ON l.module_id = m.id
         WHERE l.id = $1 AND e.user_id = $2`,
        [lessonId, userId]
      );

      if (enrollmentCheck.rows.length === 0) {
        // معلومات للتشخيص
        const debugInfo = await pool.query(`
          SELECT 
            l.id as lesson_id,
            m.course_id,
            c.title as course_title
          FROM lessons l
          JOIN modules m ON l.module_id = m.id
          JOIN courses c ON m.course_id = c.id
          WHERE l.id = $1
        `, [lessonId]);
        
        console.log('Enrollment check failed:', {
          lessonId,
          userId,
          courseInfo: debugInfo.rows[0]
        });
        
        return res.status(403).json({ 
          error: 'Not enrolled in this course',
          hint: 'Make sure you are enrolled in the course containing this lesson'
        });
      }

      // تحقق من تسليم سابق
      const submissionCheck = await pool.query(
        'SELECT * FROM submissions WHERE assignment_id = $1 AND user_id = $2',
        [assignment.rows[0].id, userId]
      );
      
      return res.json({
        message: '✅ Assignment fetched',
        assignment: assignment.rows[0],
        submission: submissionCheck.rows[0] || null
      });
    }

    // للمدرسين والأدمن
    res.json({
      message: '✅ Assignment fetched',
      assignment: assignment.rows[0]
    });

  } catch (err) {
    console.error('❌ Get assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تسليم الواجب
export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { submission_url, submission_text } = req.body;
    const studentId = req.user.id;

    // التحقق من البيانات
    if (!submission_url && !submission_text) {
      return res.status(400).json({ error: 'Submission URL or text is required' });
    }

    // التحقق من وجود الواجب
    const assignmentCheck = await pool.query(
      'SELECT * FROM assignments WHERE id = $1',
      [assignmentId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentCheck.rows[0];

    // التحقق من الموعد النهائي
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
      return res.status(400).json({ error: 'Assignment deadline has passed' });
    }

    // التحقق من التسجيل في الكورس
    const enrollmentCheck = await pool.query(
      `SELECT e.* FROM enrollments e
       JOIN modules m ON m.course_id = e.course_id
       JOIN lessons l ON l.module_id = m.id
       JOIN assignments a ON a.lesson_id = l.id
       WHERE a.id = $1 AND e.user_id = $2`,
      [assignmentId, studentId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // التحقق من عدم التسليم المسبق
    const existingSubmission = await pool.query(
      'SELECT * FROM submissions WHERE assignment_id = $1 AND user_id = $2',
      [assignmentId, studentId]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(400).json({ error: 'Assignment already submitted' });
    }

    // إنشاء التسليم
    const result = await pool.query(
      `INSERT INTO submissions (assignment_id, user_id, submission_url, submission_text, submitted_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [assignmentId, studentId, submission_url || null, submission_text || null]
    );

    res.status(201).json({
      message: '✅ Assignment submitted successfully',
      submission: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Submit assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تقييم الواجب (للمدرس)
export const gradeAssignment = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const instructorId = req.user.id;

    // التحقق من البيانات
    if (grade === undefined || grade < 0 || grade > 100) {
      return res.status(400).json({ error: 'Grade must be between 0 and 100' });
    }

    // التحقق من ملكية التسليم
    const submissionCheck = await pool.query(
      `SELECT s.*, c.instructor_id 
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN lessons l ON a.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (submissionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submissionCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to grade this submission' });
    }

    const result = await pool.query(
      `UPDATE submissions
       SET grade = $1,
           feedback = $2,
           graded_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [grade, feedback || null, submissionId]
    );

    res.json({
      message: '✅ Assignment graded successfully',
      submission: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Grade assignment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض تسليمات الواجب (للمدرس)
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const instructorId = req.user.id;

    // التحقق من ملكية الواجب
    const assignmentCheck = await pool.query(
      `SELECT a.*, c.instructor_id 
       FROM assignments a
       JOIN lessons l ON a.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE a.id = $1`,
      [assignmentId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignmentCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view these submissions' });
    }

    const submissions = await pool.query(
      `SELECT 
        s.*,
        u.name as student_name,
        u.email as student_email
       FROM submissions s
       JOIN users u ON s.user_id = u.id
       WHERE s.assignment_id = $1
       ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );

    res.json({
      message: '✅ Submissions fetched',
      submissions: submissions.rows
    });

  } catch (err) {
    console.error('❌ Get submissions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};