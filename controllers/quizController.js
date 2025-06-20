// controllers/quizController.js
import pool from '../config/db.js';

/**
 * إنشاء أو إضافة أسئلة جديدة إلى اختبار الدرس
 */
export const createQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { questions } = req.body;
    const instructorId = req.user.id;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    // تحقق من ملكية الدرس
    const lessonCheck = await pool.query(
      `SELECT c.instructor_id
       FROM lessons l
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE l.id = $1`,
      [lessonId]
    );
    if (!lessonCheck.rows.length) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (lessonCheck.rows[0].instructor_id !== instructorId) {
      return res.status(403).json({ error: 'Not authorized to add questions to this lesson' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = [];
      for (const q of questions) {
        const { id, type, question, options, correct_answer, answer } = q;
        if (id) continue; // سؤال موجود مسبقاً، نتخطاه

        // validation...
        if (!question || !type) throw new Error('Each question needs text and type');
        if (type === 'multiple_choice') {
          if (!Array.isArray(options) || options.length < 2) throw new Error('Multiple choice requires at least 2 options');
          if (correct_answer == null || correct_answer < 0 || correct_answer >= options.length) throw new Error('Invalid correct_answer index');
        } else if (type === 'true_false') {
          if (correct_answer !== 'true' && correct_answer !== 'false') throw new Error('True/False requires correct_answer "true" or "false"');
        } else if (type === 'short_answer') {
          if (typeof answer !== 'string' || !answer.trim()) throw new Error('Short answer requires a non-empty answer');
        }

        const optionsJson =
          type === 'multiple_choice'
            ? JSON.stringify(options)
            : type === 'true_false'
            ? JSON.stringify(['true', 'false'])
            : JSON.stringify([]);
        const correctAnsVal =
          type === 'multiple_choice'
            ? correct_answer
            : type === 'true_false'
            ? correct_answer === 'true' ? 1 : 0
            : 0;

        const result = await client.query(
          `INSERT INTO quizzes
             (lesson_id, question, type, options, correct_answer, answer)
           VALUES
             ($1, $2, $3, $4::jsonb, $5, $6)
           RETURNING *`,
          [lessonId, question, type, optionsJson, correctAnsVal, type === 'short_answer' ? answer : null]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.status(201).json({ message: '✅ Questions added', quiz: inserted });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Create/add questions error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

/**
 * جلب اختبار الدرس مع محاولة الطالب إن وجدت
 */
export const getLessonQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const user = req.user;

    if (user.role === 'student') {
      const enrolled = await pool.query(
        `SELECT 1
         FROM enrollments e
         JOIN modules m ON e.course_id = m.course_id
         JOIN lessons l ON l.module_id = m.id
         WHERE l.id = $1 AND e.user_id = $2`,
        [lessonId, user.id]
      );
      if (!enrolled.rows.length) return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const quizRes = await pool.query(
      `SELECT id, question, type, options, correct_answer, answer
       FROM quizzes
       WHERE lesson_id = $1
       ORDER BY id`,
      [lessonId]
    );

    let attempt = null;
    if (user.role === 'student') {
      const atRes = await pool.query(
        `SELECT score
         FROM quiz_attempts
         WHERE user_id = $1 AND lesson_id = $2
         LIMIT 1`,
        [user.id, lessonId]
      );
      attempt = atRes.rows[0] || null;
    }

    res.json({ message: '✅ Quiz fetched', quiz: quizRes.rows, attempt });
  } catch (err) {
    console.error('❌ Get quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * تسليم إجابات الاختبار
 */
export const submitQuiz = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.id;

    if (!Array.isArray(answers)) return res.status(400).json({ error: 'Answers array is required' });

    const enrolled = await pool.query(
      `SELECT 1
       FROM enrollments e
       JOIN modules m ON e.course_id = m.course_id
       JOIN lessons l ON l.module_id = m.id
       WHERE l.id = $1 AND e.user_id = $2`,
      [lessonId, studentId]
    );
    if (!enrolled.rows.length) return res.status(403).json({ error: 'Not enrolled in this course' });

    const quizData = await pool.query(
      `SELECT id, type, correct_answer, answer
       FROM quizzes
       WHERE lesson_id = $1
       ORDER BY id`,
      [lessonId]
    );
    const questions = quizData.rows;
    if (!questions.length) return res.status(404).json({ error: 'No quiz found for this lesson' });

    let correctCount = 0;
    const results = questions.map((q, idx) => {
      const userAns = answers[idx];
      let isCorrect = q.type === 'short_answer'
        ? typeof userAns === 'string' && userAns.trim().toLowerCase() === q.answer.trim().toLowerCase()
        : userAns === q.correct_answer;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        userAnswer: userAns,
        correctAnswer: q.type === 'short_answer' ? q.answer : q.correct_answer,
        isCorrect
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);

    await pool.query(
      `INSERT INTO quiz_attempts (user_id, lesson_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET score = EXCLUDED.score, submitted_at = CURRENT_TIMESTAMP`,
      [studentId, lessonId, score]
    );

    res.json({ message: '✅ Quiz submitted', score, totalQuestions: questions.length, correctAnswers: correctCount, results });
  } catch (err) {
    console.error('❌ Submit quiz error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ... the rest of quizController unchanged (updateQuizQuestion, deleteQuizQuestion, getCourseQuizzes) ...


/**
 * تحديث سؤال فردي (مدرس/أدمن)
 */
export const updateQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { question, type, options, correct_answer, answer } = req.body;
    const userId = req.user.id;

    const check = await pool.query(
      `SELECT c.instructor_id
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE q.id = $1`,
      [questionId]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const ownerId = check.rows[0].instructor_id;
    if (ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this question' });
    }

    if (type === 'multiple_choice') {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: 'Multiple choice requires ≥2 options' });
      }
      if (
        correct_answer == null ||
        correct_answer < 0 ||
        correct_answer >= options.length
      ) {
        return res.status(400).json({ error: 'Invalid correct_answer index' });
      }
    } else if (type === 'true_false') {
      if (correct_answer !== 'true' && correct_answer !== 'false') {
        return res.status(400).json({ error: 'True/False requires "true" or "false"' });
      }
    } else if (type === 'short_answer') {
      if (typeof answer !== 'string' || !answer.trim()) {
        return res.status(400).json({ error: 'Short answer requires non-empty answer' });
      }
    }

    const result = await pool.query(
      `UPDATE quizzes
       SET
         question       = COALESCE($1, question),
         type           = COALESCE($2, type),
         options        = COALESCE($3::jsonb, options),
         correct_answer = COALESCE($4, correct_answer),
         answer         = COALESCE($5, answer)
       WHERE id = $6
       RETURNING *`,
      [
        question || null,
        type || null,
        options != null ? JSON.stringify(options) : null,
        correct_answer != null ? correct_answer : null,
        answer != null ? answer : null,
        questionId
      ]
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

/**
 * حذف سؤال
 */
export const deleteQuizQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const check = await pool.query(
      `SELECT c.instructor_id
       FROM quizzes q
       JOIN lessons l ON q.lesson_id = l.id
       JOIN modules m ON l.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE q.id = $1`,
      [questionId]
    );
    if (!check.rows.length) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const ownerId = check.rows[0].instructor_id;
    if (ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this question' });
    }

    await pool.query('DELETE FROM quizzes WHERE id = $1', [questionId]);
    res.json({ message: '✅ Question deleted successfully' });
  } catch (err) {
    console.error('❌ Delete question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * GET جميع الاختبارات في الكورس (طالب)
 */
export const getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT
        l.id AS lesson_id,
        l.title AS lesson_title,
        COUNT(q.id) AS question_count,
        MAX(a.score) AS score
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      JOIN quizzes q ON q.lesson_id = l.id
      LEFT JOIN quiz_attempts a
        ON a.lesson_id = l.id AND a.user_id = $2
      WHERE c.id = $1
      GROUP BY l.id, l.title
      ORDER BY l.id
    `, [courseId, userId]);

    res.json({ quizzes: result.rows });
  } catch (err) {
    console.error('❌ getCourseQuizzes error:', err);
    res.status(500).json({ error: 'Server error fetching quizzes' });
  }
};
export const getQuizAttemptsForLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    // ممكن تضيف تحقق ملكية الدرس للمدرس الحالي إذا تحب

    const result = await pool.query(
      `SELECT qa.id, qa.user_id, u.name, qa.score, qa.submitted_at
       FROM quiz_attempts qa
       JOIN users u ON qa.user_id = u.id
       WHERE qa.lesson_id = $1
       ORDER BY qa.submitted_at DESC`,
      [lessonId]
    );

    res.json({ attempts: result.rows });
  } catch (err) {
    console.error('❌ getQuizAttemptsForLesson error:', err);
    res.status(500).json({ error: 'Server error fetching attempts' });
  }
};
