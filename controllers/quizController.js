// controllers/quizController.js
import pool from '../config/db.js';

// إنشاء اختبار جديد
export const createQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { questions } = req.body;
    const instructorId = req.user.id;

    // التحقق من البيانات
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
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
      return res.status(403).json({ error: 'Not authorized to add quiz to this lesson' });
    }

    // التحقق من عدم وجود اختبار سابق للدرس
    const existingQuiz = await pool.query(
      'SELECT * FROM quizzes WHERE lesson_id = $1',
      [lessonId]
    );

    if (existingQuiz.rows.length > 0) {
      return res.status(400).json({ error: 'Quiz already exists for this lesson' });
    }

    // البدء بـ transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // إدخال الأسئلة
      const quizzes = [];
      for (const question of questions) {
        const { question: questionText, options, correct_answer } = question;

        // التحقق من صحة البيانات
        if (!questionText || !options || !Array.isArray(options) || options.length < 2) {
          throw new Error('Invalid question format');
        }

        if (correct_answer === undefined || correct_answer >= options.length) {
          throw new Error('Invalid correct answer index');
        }

        const result = await client.query(
          `INSERT INTO quizzes (lesson_id, question, options, correct_answer)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [lessonId, questionText, JSON.stringify(options), correct_answer]
        );

        quizzes.push(result.rows[0]);
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: '✅ Quiz created successfully',
        quiz: quizzes
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('❌ Create quiz error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

// الحصول على اختبار الدرس
export const getLessonQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;

    // التحقق من التسجيل في الكورس (للطلاب)
    if (userId && req.user.role === 'student') {
      const enrollmentCheck = await pool.query(
        `SELECT e.* FROM enrollments e
         JOIN modules m ON m.course_id = e.course_id
         JOIN lessons l ON l.module_id = m.id
         WHERE l.id = $1 AND e.user_id = $2`,
        [lessonId, userId]
      );

      if (enrollmentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    // جلب أسئلة الاختبار
    const quiz = await pool.query(
      `SELECT id, question, options
       FROM quizzes
       WHERE lesson_id = $1
       ORDER BY id`,
      [lessonId]
    );

    res.json({
      message: '✅ Quiz fetched',
      quiz: quiz.rows
    });

  } catch (err) {
    console.error('❌ Get quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تسليم إجابات الاختبار
export const submitQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.id;

    // التحقق من البيانات
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Answers array is required' });
    }

    // التحقق من التسجيل
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

    // جلب الأسئلة مع الإجابات الصحيحة
    const quiz = await pool.query(
      'SELECT id, correct_answer FROM quizzes WHERE lesson_id = $1 ORDER BY id',
      [lessonId]
    );

    if (quiz.rows.length === 0) {
      return res.status(404).json({ error: 'No quiz found for this lesson' });
    }

    // حساب النتيجة
    let correctAnswers = 0;
    const results = [];

    for (let i = 0; i < quiz.rows.length; i++) {
      const question = quiz.rows[i];
      const userAnswer = answers[i];
      const isCorrect = userAnswer === question.correct_answer;

      if (isCorrect) correctAnswers++;

      results.push({
        questionId: question.id,
        userAnswer,
        correctAnswer: question.correct_answer,
        isCorrect
      });
    }

    const score = Math.round((correctAnswers / quiz.rows.length) * 100);

    // حفظ النتيجة (يمكنك إنشاء جدول quiz_attempts لحفظ المحاولات)
    res.json({
      message: '✅ Quiz submitted',
      score,
      totalQuestions: quiz.rows.length,
      correctAnswers,
      results
    });

  } catch (err) {
    console.error('❌ Submit quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تحديث سؤال
export const updateQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { question, options, correct_answer } = req.body;
    const instructorId = req.user.id;

    // التحقق من ملكية السؤال
    const questionCheck = await pool.query(
      `SELECT q.*, c.instructor_id 
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE q.id = $1`,
      [questionId]
    );

    if (questionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (questionCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this question' });
    }

    const result = await pool.query(
      `UPDATE quizzes
       SET question = COALESCE($1, question),
           options = COALESCE($2, options),
           correct_answer = COALESCE($3, correct_answer)
       WHERE id = $4
       RETURNING *`,
      [question, options ? JSON.stringify(options) : null, correct_answer, questionId]
    );

    res.json({
      message: '✅ Question updated',
      question: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Update question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// حذف سؤال
export const deleteQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const instructorId = req.user.id;

    // التحقق من ملكية السؤال
    const questionCheck = await pool.query(
      `SELECT q.*, c.instructor_id 
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE q.id = $1`,
      [questionId]
    );

    if (questionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    if (questionCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this question' });
    }

    await pool.query('DELETE FROM quizzes WHERE id = $1', [questionId]);

    res.json({
      message: '✅ Question deleted successfully'
    });

  } catch (err) {
    console.error('❌ Delete question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};