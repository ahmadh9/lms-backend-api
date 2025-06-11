// controllers/searchController.js
import pool from '../config/db.js';

// البحث في الكورسات
export const searchCourses = async (req, res) => {
  try {
    const { q, category, instructor, sortBy = 'relevance', page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        c.*,
        u.name as instructor_name,
        cat.name as category_name,
        COUNT(DISTINCT e.id) as student_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.is_approved = true
        AND (c.title ILIKE $1 OR c.description ILIKE $1)
    `;

    const params = [`%${q}%`];
    let paramIndex = 2;

    // فلترة حسب التصنيف
    if (category) {
      query += ` AND c.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // فلترة حسب المدرس
    if (instructor) {
      query += ` AND c.instructor_id = $${paramIndex}`;
      params.push(instructor);
      paramIndex++;
    }

    query += ' GROUP BY c.id, u.name, cat.name';

    // الترتيب
    switch (sortBy) {
      case 'newest':
        query += ' ORDER BY c.created_at DESC';
        break;
      case 'popular':
        query += ' ORDER BY student_count DESC';
        break;
      case 'title':
        query += ' ORDER BY c.title ASC';
        break;
      default:
        query += ' ORDER BY c.created_at DESC';
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // عدد النتائج الكلي
    const countQuery = `
      SELECT COUNT(DISTINCT c.id)
      FROM courses c
      WHERE c.is_approved = true
        AND (c.title ILIKE $1 OR c.description ILIKE $1)
        ${category ? `AND c.category_id = $2` : ''}
        ${instructor ? `AND c.instructor_id = $${category ? 3 : 2}` : ''}
    `;

    const countParams = [`%${q}%`];
    if (category) countParams.push(category);
    if (instructor) countParams.push(instructor);

    const totalCount = await pool.query(countQuery, countParams);

    res.json({
      message: '✅ Search results',
      courses: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (err) {
    console.error('❌ Search courses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// فلترة الكورسات
export const filterCourses = async (req, res) => {
  try {
    const {
      category,
      minStudents = 0,
      maxStudents,
      isApproved = true,
      hasCertificate,
      sortBy = 'created_at',
      order = 'DESC',
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;

    let query = `
      SELECT 
        c.*,
        u.name as instructor_name,
        cat.name as category_name,
        COUNT(DISTINCT e.id) as student_count
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE 1=1
    `;

    // الفلاتر
    if (isApproved !== undefined) {
      query += ` AND c.is_approved = $${paramIndex}`;
      params.push(isApproved === 'true');
      paramIndex++;
    }

    if (category) {
      query += ` AND c.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ' GROUP BY c.id, u.name, cat.name';

    // فلترة حسب عدد الطلاب
    if (minStudents > 0) {
      query = `SELECT * FROM (${query}) AS filtered WHERE student_count >= $${paramIndex}`;
      params.push(minStudents);
      paramIndex++;
    }

    if (maxStudents) {
      query = `SELECT * FROM (${query}) AS filtered WHERE student_count <= $${paramIndex}`;
      params.push(maxStudents);
      paramIndex++;
    }

    // الترتيب
    const allowedSortFields = ['created_at', 'title', 'student_count'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortField} ${sortOrder}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      message: '✅ Filtered courses',
      courses: result.rows,
      filters: {
        category,
        minStudents,
        maxStudents,
        isApproved
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (err) {
    console.error('❌ Filter courses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// البحث في المستخدمين
export const searchUsers = async (req, res) => {
  try {
    const { q, role, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // التحقق من صلاحيات الأدمن
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const offset = (page - 1) * limit;
    const params = [`%${q}%`];
    let paramIndex = 2;

    let query = `
      SELECT id, name, email, role, avatar, created_at
      FROM users
      WHERE (name ILIKE $1 OR email ILIKE $1)
    `;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // عدد النتائج الكلي
    const countQuery = `
      SELECT COUNT(*)
      FROM users
      WHERE (name ILIKE $1 OR email ILIKE $1)
      ${role ? `AND role = $2` : ''}
    `;

    const countParams = [`%${q}%`];
    if (role) countParams.push(role);

    const totalCount = await pool.query(countQuery, countParams);

    res.json({
      message: '✅ User search results',
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(totalCount.rows[0].count),
        pages: Math.ceil(totalCount.rows[0].count / limit)
      }
    });

  } catch (err) {
    console.error('❌ Search users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};