// controllers/progressController.js
import pool from '../config/db.js';

// تقدم الطالب في كورس معين
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    // التحقق من التسجيل
    const enrollment = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(404).json({ error: 'Not enrolled in this course' });
    }

    // عدد الوحدات الكلي
    const totalModules = await pool.query(
      'SELECT COUNT(*) FROM modules WHERE course_id = $1',
      [courseId]
    );

    // عدد الدروس الكلي
    const totalLessons = await pool.query(`
      SELECT COUNT(*) 
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = $1
    `, [courseId]);

    // الدروس المكتملة (يحتاج جدول lesson_completions)
    // مؤقتاً نستخدم نسبة تقريبية
    const completedLessons = Math.floor(
      (enrollment.rows[0].progress / 100) * totalLessons.rows[0].count
    );

    // الواجبات
    const assignments = await pool.query(`
      SELECT 
        a.*,
        s.submitted_at,
        s.grade,
        l.title as lesson_title
      FROM assignments a
      JOIN lessons l ON a.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      LEFT JOIN submissions s ON a.id = s.assignment_id AND s.user_id = $1
      WHERE m.course_id = $2
      ORDER BY l.order
    `, [studentId, courseId]);

    // الاختبارات
    const quizzes = await pool.query(`
      SELECT 
        COUNT(DISTINCT q.lesson_id) as total_quizzes
      FROM quizzes q
      JOIN lessons l ON q.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = $1
    `, [courseId]);

    res.json({
      message: '✅ Course progress fetched',
      progress: {
        enrollment: enrollment.rows[0],
        modules: {
          total: parseInt(totalModules.rows[0].count),
          completed: Math.floor(
            (enrollment.rows[0].progress / 100) * totalModules.rows[0].count
          )
        },
        lessons: {
          total: parseInt(totalLessons.rows[0].count),
          completed: completedLessons
        },
        assignments: {
          total: assignments.rows.length,
          submitted: assignments.rows.filter(a => a.submitted_at).length,
          graded: assignments.rows.filter(a => a.grade !== null).length,
          details: assignments.rows
        },
        quizzes: {
          total: parseInt(quizzes.rows[0].total_quizzes)
        }
      }
    });

  } catch (err) {
    console.error('❌ Course progress error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تقدم الطالب في وحدة معينة
export const getModuleProgress = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const studentId = req.user.id;

    // معلومات الوحدة
    const moduleInfo = await pool.query(`
      SELECT m.*, c.title as course_title
      FROM modules m
      JOIN courses c ON m.course_id = c.id
      WHERE m.id = $1
    `, [moduleId]);

    if (moduleInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const module = moduleInfo.rows[0];

    // التحقق من التسجيل
    const enrollment = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentId, module.course_id]
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // دروس الوحدة
    const lessons = await pool.query(
      'SELECT * FROM lessons WHERE module_id = $1 ORDER BY "order"',
      [moduleId]
    );

    // حالة كل درس (مؤقتاً نعتبر أن نسبة معينة مكتملة)
    const moduleProgress = Math.floor(
      (enrollment.rows[0].progress / 100) * lessons.rows.length
    );

    const lessonsWithStatus = lessons.rows.map((lesson, index) => ({
      ...lesson,
      isCompleted: index < moduleProgress
    }));

    res.json({
      message: '✅ Module progress fetched',
      module: module,
      progress: {
        totalLessons: lessons.rows.length,
        completedLessons: moduleProgress,
        percentage: lessons.rows.length > 0 
          ? Math.round((moduleProgress / lessons.rows.length) * 100)
          : 0,
        lessons: lessonsWithStatus
      }
    });

  } catch (err) {
    console.error('❌ Module progress error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تسجيل إكمال درس
export const markLessonComplete = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.user.id;

    // التحقق من الدرس والتسجيل
    const lessonCheck = await pool.query(`
      SELECT l.*, m.course_id, e.id as enrollment_id, e.progress
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN enrollments e ON e.course_id = m.course_id AND e.user_id = $1
      WHERE l.id = $2
    `, [studentId, lessonId]);

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found or not enrolled' });
    }

    const lesson = lessonCheck.rows[0];

    // هنا يمكنك إنشاء جدول lesson_completions لتتبع الدروس المكتملة
    // مؤقتاً، نحدث progress في enrollments

    // حساب التقدم الجديد
    const totalLessons = await pool.query(`
      SELECT COUNT(*) 
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = $1
    `, [lesson.course_id]);

    const newProgress = Math.min(
      100,
      lesson.progress + Math.floor(100 / totalLessons.rows[0].count)
    );

    // تحديث التقدم
    await pool.query(
      'UPDATE enrollments SET progress = $1 WHERE id = $2',
      [newProgress, lesson.enrollment_id]
    );

    res.json({
      message: '✅ Lesson marked as complete',
      newProgress: newProgress
    });

  } catch (err) {
    console.error('❌ Mark lesson complete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};