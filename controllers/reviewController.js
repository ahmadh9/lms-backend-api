// controllers/reviewController.js
import pool from '../config/db.js';

// إضافة تقييم للكورس
export const createReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;
    const studentId = req.user.id;

    // التحقق من البيانات
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // التحقق من التسجيل في الكورس
    const enrollment = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: 'Must be enrolled to review' });
    }

    // التحقق من عدم وجود تقييم سابق
    const existingReview = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Already reviewed this course' });
    }

    // إنشاء التقييم
    const result = await pool.query(
      `INSERT INTO reviews (course_id, user_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [courseId, studentId, rating, comment || null]
    );

    res.status(201).json({
      message: '✅ Review created successfully',
      review: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Create review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض تقييمات الكورس
export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // التقييمات مع معلومات المستخدمين
    const reviews = await pool.query(`
      SELECT 
        r.*,
        u.name as user_name,
        u.avatar as user_avatar
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.course_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [courseId, limit, offset]);

    // إحصائيات التقييمات
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE course_id = $1
    `, [courseId]);

    res.json({
      message: '✅ Reviews fetched',
      reviews: reviews.rows,
      stats: {
        totalReviews: parseInt(stats.rows[0].total_reviews),
        averageRating: parseFloat(stats.rows[0].average_rating || 0).toFixed(1),
        distribution: {
          5: parseInt(stats.rows[0].five_stars),
          4: parseInt(stats.rows[0].four_stars),
          3: parseInt(stats.rows[0].three_stars),
          2: parseInt(stats.rows[0].two_stars),
          1: parseInt(stats.rows[0].one_star)
        }
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Get reviews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تحديث التقييم
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // التحقق من ملكية التقييم
    const review = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (review.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // التحقق من البيانات
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // تحديث التقييم
    const result = await pool.query(
      `UPDATE reviews
       SET rating = COALESCE($1, rating),
           comment = COALESCE($2, comment),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rating, comment, reviewId]
    );

    res.json({
      message: '✅ Review updated successfully',
      review: result.rows[0]
    });

  } catch (err) {
    console.error('❌ Update review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// حذف التقييم
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // التحقق من ملكية التقييم أو صلاحيات الأدمن
    const review = await pool.query(
      'SELECT * FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (review.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.rows[0].user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // حذف التقييم
    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({
      message: '✅ Review deleted successfully'
    });

  } catch (err) {
    console.error('❌ Delete review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};