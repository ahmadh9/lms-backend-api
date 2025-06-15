// controllers/courseController.js
import pool from '../config/db.js';

// [1] إضافة كورس جديد
export const createCourse = async (req, res) => {
  try {
    const { title, description, category_id, thumbnail } = req.body;
    const instructor_id = req.user.id;

    // التحقق من البيانات المطلوبة
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // التحقق من وجود التصنيف
    if (category_id) {
      const categoryCheck = await pool.query(
        'SELECT * FROM categories WHERE id = $1',
        [category_id]
      );
      
      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }

    const result = await pool.query(
      `INSERT INTO courses (title, description, instructor_id, category_id, thumbnail, status, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [title, description, instructor_id, category_id || null, thumbnail || null, 'pending', false]
    );

    res.status(201).json({
      message: '✅ Course created successfully',
      course: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Create course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// [2] جلب كل الكورسات
export const getAllCourses = async (req, res) => {
  try {
    console.log('📍 Getting all courses...');
    
    const result = await pool.query(`
  SELECT 
    c.*, 
    u.name as instructor_name, 
    cat.name as category_name,
    CAST(COUNT(DISTINCT e.id) AS INTEGER) as students_count
  FROM courses c
  JOIN users u ON c.instructor_id = u.id
  LEFT JOIN categories cat ON c.category_id = cat.id
  LEFT JOIN enrollments e ON c.id = e.course_id
  GROUP BY c.id, u.name, cat.name
`);

    
    console.log('Number of courses:', result.rows.length);

    res.json({
      message: '✅ Courses fetched',
      courses: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('❌ Get courses error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// [3] جلب تفاصيل كورس معيّن
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // معلومات الكورس
    const courseResult = await pool.query(
      `SELECT 
        c.*,
        u.name as instructor_name,
        cat.name as category_name,
        COUNT(DISTINCT e.id) as students_count
       FROM courses c
       JOIN users u ON c.instructor_id = u.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       LEFT JOIN enrollments e ON c.id = e.course_id
       WHERE c.id = $1
       GROUP BY c.id, u.name, cat.name`,
      [id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseResult.rows[0];

    // الوحدات والدروس
    const modulesResult = await pool.query(
      `SELECT 
        m.*,
        json_agg(
          json_build_object(
            'id', l.id,
            'title', l.title,
            'content_type', l.content_type,
            'duration', l.duration,
            'order', l.order
          ) ORDER BY l.order
        ) FILTER (WHERE l.id IS NOT NULL) as lessons
       FROM modules m
       LEFT JOIN lessons l ON m.id = l.module_id
       WHERE m.course_id = $1
       GROUP BY m.id
       ORDER BY m.order`,
      [id]
    );

    // التحقق من التسجيل
    let isEnrolled = false;
    if (userId && req.user.role === 'student') {
      const enrollmentCheck = await pool.query(
        'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [userId, id]
      );
      isEnrolled = enrollmentCheck.rows.length > 0;
    }

    res.json({
      message: '✅ Course details fetched',
      course: {
        ...course,
        modules: modulesResult.rows,
        isEnrolled
      }
    });
  } catch (err) {
    console.error('❌ Get course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// [4] تعديل كورس (فقط للمدرس صاحب الكورس أو الأدمن)
export const updateCourse = async (req, res) => {
  const { id } = req.params;
const { title, description, category_id, price, thumbnail_url, is_published, status, rejection_reason } = req.body;  try {
    // التحقق من الملكية أو أن المستخدم أدمن
    const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    const course = courseRes.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not allowed.' });
    }
    
   const result = await pool.query(
  `UPDATE courses SET
    title = COALESCE($1, title),
    description = COALESCE($2, description),
    category_id = COALESCE($3, category_id),
    price = COALESCE($4, price),
    thumbnail_url = COALESCE($5, thumbnail_url),
    is_published = COALESCE($6, is_published),
    status = COALESCE($7, status),
    rejection_reason = COALESCE($8, rejection_reason),
    is_approved = CASE 
      WHEN $7 = 'rejected' THEN false 
      WHEN $7 = 'approved' THEN true 
      ELSE is_approved 
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $9
  RETURNING *`,
  [title, description, category_id, price, thumbnail_url, is_published, status, rejection_reason, id]
);
    
    res.json({ message: '✅ Course updated', course: result.rows[0] });
  } catch (err) {
    console.error('❌ Update course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// [5] حذف كورس (فقط للمدرس صاحب الكورس أو الأدمن)
export const deleteCourse = async (req, res) => {
  const { id } = req.params;
  try {
    const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
    const course = courseRes.rows[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. Not allowed.' });
    }
    
    await pool.query('DELETE FROM courses WHERE id = $1', [id]);
    res.json({ message: '✅ Course deleted' });
  } catch (err) {
    console.error('❌ Delete course error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// [6] رفض كورس (للأدمن فقط)
export const rejectCourse = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
    // تحديث الكورس ليكون مرفوض
    const result = await pool.query(
      `UPDATE courses 
       SET status = 'rejected', 
           is_approved = false,
           rejection_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reason || 'Course does not meet quality standards', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ 
      success: true,
      message: 'Course rejected successfully',
      course: result.rows[0] 
    });
  } catch (error) {
    console.error('Reject course error:', error);
    res.status(500).json({ error: 'Failed to reject course' });
  }
};

// [7] موافقة الأدمن على كورس
export const approveCourse = async (req, res) => {
  const { id } = req.params;
  console.log('Approve course called for ID:', id); // للتشخيص
  
  try {
    const result = await pool.query(
            `UPDATE courses 
       SET is_approved = true, 
           is_published = true,  -- نشر تلقائي عند الموافقة
           status = 'approved',
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    
    console.log('Update result:', result.rows); // للتشخيص
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json({ message: '✅ Course approved', course: result.rows[0] });
  } catch (err) {
    console.error('❌ Approve error details:', err); // تفاصيل الخطأ
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};