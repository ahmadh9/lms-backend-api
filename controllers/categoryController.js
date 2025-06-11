// controllers/categoryController.js
import pool from '../config/db.js';

// عرض جميع التصنيفات
export const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.description,
        c.icon,
        COUNT(DISTINCT co.id) as courses_count
       FROM categories c
       LEFT JOIN courses co ON c.id = co.category_id
       GROUP BY c.id
       ORDER BY c.name ASC`
    );

    res.json({
      message: '✅ Categories fetched',
      categories: result.rows
    });
  } catch (err) {
    console.error('❌ Get categories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض تصنيف واحد مع كورساته
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // جلب معلومات التصنيف
    const categoryResult = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // جلب الكورسات في هذا التصنيف
    const coursesResult = await pool.query(
      `SELECT 
        c.id,
        c.title,
        c.description,
        c.thumbnail,
        c.is_approved,
        u.name as instructor_name
       FROM courses c
       JOIN users u ON c.instructor_id = u.id
       WHERE c.category_id = $1 AND c.is_approved = true
       ORDER BY c.created_at DESC`,
      [id]
    );

    res.json({
      message: '✅ Category details fetched',
      category: categoryResult.rows[0],
      courses: coursesResult.rows
    });
  } catch (err) {
    console.error('❌ Get category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// إضافة تصنيف جديد (أدمن فقط)
export const createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // التحقق من عدم تكرار الاسم
    const existing = await pool.query(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER($1)',
      [name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, description, icon)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || null, icon || null]
    );

    res.status(201).json({
      message: '✅ Category created successfully',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Create category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تحديث تصنيف (أدمن فقط)
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon } = req.body;

    // التحقق من وجود التصنيف
    const existing = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // التحقق من عدم تكرار الاسم
    if (name) {
      const duplicate = await pool.query(
        'SELECT * FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name, id]
      );

      if (duplicate.rows.length > 0) {
        return res.status(400).json({ error: 'Category name already exists' });
      }
    }

    const result = await pool.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           icon = COALESCE($3, icon)
       WHERE id = $4
       RETURNING *`,
      [name, description, icon, id]
    );

    res.json({
      message: '✅ Category updated successfully',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Update category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// حذف تصنيف (أدمن فقط)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // التحقق من عدم وجود كورسات في التصنيف
    const coursesCheck = await pool.query(
      'SELECT COUNT(*) FROM courses WHERE category_id = $1',
      [id]
    );

    if (parseInt(coursesCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with courses. Move or delete courses first.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      message: '✅ Category deleted successfully',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Delete category error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// البحث في التصنيفات
export const searchCategories = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.description,
        COUNT(DISTINCT co.id) as courses_count
       FROM categories c
       LEFT JOIN courses co ON c.id = co.category_id
       WHERE c.name ILIKE $1 OR c.description ILIKE $1
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [`%${q}%`]
    );

    res.json({
      message: '✅ Search results',
      categories: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('❌ Search categories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};