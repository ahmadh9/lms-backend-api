// controllers/lessonController.js
import pool from '../config/db.js';

// إضافة درس جديد
export const createLesson = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, content_type, content_url, duration, description } = req.body;
    const instructorId = req.user.id;

    // التحقق من البيانات المطلوبة
    if (!title || !content_type) {
      return res.status(400).json({ error: 'Title and content type are required' });
    }

    // التحقق من نوع المحتوى
   // قبل التعديل: validTypes = ['video', 'text', 'quiz', 'assignment']
const validTypes = ['video', 'text', 'quiz']; // نزلنا "assignment"

if (!validTypes.includes(content_type)) {
  return res.status(400).json({ error: 'Invalid content type' });
}


    // التحقق من ملكية الوحدة
    const moduleCheck = await pool.query(
      `SELECT m.*, c.instructor_id 
       FROM modules m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = $1`,
      [moduleId]
    );

    if (moduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (moduleCheck.rows[0].instructor_id !== instructorId) {
      return res.status(403).json({ error: 'Not authorized to add lessons to this module' });
    }

    // تحديد الترتيب التلقائي
    const maxOrder = await pool.query(
      'SELECT MAX("order") as max_order FROM lessons WHERE module_id = $1',
      [moduleId]
    );
    const lessonOrder = (maxOrder.rows[0].max_order || 0) + 1;

    const result = await pool.query(
      `INSERT INTO lessons (module_id, title, content_type, content_url, duration, description, "order")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [moduleId, title, content_type, content_url || null, duration || 0, description || null, lessonOrder]
    );

    res.status(201).json({
      message: '✅ Lesson created successfully',
      lesson: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Create lesson error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض دروس الوحدة
export const getModuleLessons = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const lessons = await pool.query(
      `SELECT * FROM lessons
       WHERE module_id = $1
       ORDER BY "order" ASC`,
      [moduleId]
    );

    res.json({
      message: '✅ Lessons fetched',
      lessons: lessons.rows
    });
  } catch (err) {
    console.error('❌ Get lessons error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض درس واحد
export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;

    // 1) جلب الدرس مع course_id
    const lessonRes = await pool.query(
      `SELECT l.*, m.course_id
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       WHERE l.id = $1`,
      [lessonId]
    );
    const lesson = lessonRes.rows[0];
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // 2) تأكد أن الطالب مسجل
    if (userId && req.user.role === 'student') {
      const enrollmentCheck = await pool.query(
        `SELECT 1
         FROM enrollments e
         JOIN modules m ON m.course_id = e.course_id
         JOIN lessons l ON l.module_id = m.id
         WHERE l.id = $1 AND e.user_id = $2`,
        [lessonId, userId]
      );
      if (enrollmentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    // 3) جلب كل دروس الموديول المرتبط
    const moduleLessonsRes = await pool.query(
      `SELECT id, title
       FROM lessons
       WHERE module_id = $1
       ORDER BY "order" ASC`,
      [lesson.module_id]
    );
    const moduleLessons = moduleLessonsRes.rows;

    // 4) حدد الدرس التالي
    let nextLessonId = null;
    const idx = moduleLessons.findIndex(l => l.id === lesson.id);
    if (idx !== -1 && idx + 1 < moduleLessons.length) {
      nextLessonId = moduleLessons[idx + 1].id;
    }

    // 5) رجّع كل البيانات
    return res.json({
      message: '✅ Lesson fetched',
      lesson,
      moduleLessons,
      nextLessonId
    });
  } catch (err) {
    console.error('❌ Get lesson error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};



// تحديث درس
export const updateLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, content_type, content_url, duration, description, order } = req.body;
    const instructorId = req.user.id;

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

    if (lessonCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this lesson' });
    }

    const result = await pool.query(
      `UPDATE lessons
       SET title = COALESCE($1, title),
           content_type = COALESCE($2, content_type),
           content_url = COALESCE($3, content_url),
           duration = COALESCE($4, duration),
           description = COALESCE($5, description),
           "order" = COALESCE($6, "order")
       WHERE id = $7
       RETURNING *`,
      [title, content_type, content_url, duration, description, order, lessonId]
    );

    res.json({
      message: '✅ Lesson updated successfully',
      lesson: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Update lesson error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// حذف درس
export const deleteLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const instructorId = req.user.id;

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

    if (lessonCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this lesson' });
    }

    await pool.query('DELETE FROM lessons WHERE id = $1', [lessonId]);

    res.json({
      message: '✅ Lesson deleted successfully'
    });
  } catch (err) {
    console.error('❌ Delete lesson error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تسجيل مشاهدة الدرس (للطلاب)
export const markLessonComplete = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.user.id;

    // التحقق من التسجيل في الكورس
    const enrollmentCheck = await pool.query(
      `SELECT e.* FROM enrollments e
       JOIN modules m ON m.course_id = e.course_id
       JOIN lessons l ON l.module_id = m.id
       WHERE l.id = $1 AND e.user_id = $2`,
      [lessonId, studentId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // هنا يمكنك إضافة جدول lesson_completions لتتبع الدروس المكتملة
    // مؤقتاً، نحدث تقدم الطالب في الكورس

    res.json({
      message: '✅ Lesson marked as complete'
    });
  } catch (err) {
    console.error('❌ Mark lesson complete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};