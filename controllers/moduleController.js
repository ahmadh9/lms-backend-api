// controllers/moduleController.js
import pool from '../config/db.js';

// إضافة وحدة جديدة للكورس
export const createModule = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, order } = req.body;
    const instructorId = req.user.id;

    // التحقق من البيانات المطلوبة
    if (!title) {
      return res.status(400).json({ error: 'Module title is required' });
    }

    // التحقق من ملكية الكورس
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
      [courseId, instructorId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to add modules to this course' });
    }

    // تحديد الترتيب التلقائي
    let moduleOrder = order;
    if (!moduleOrder) {
      const maxOrder = await pool.query(
        'SELECT MAX("order") as max_order FROM modules WHERE course_id = $1',
        [courseId]
      );
      moduleOrder = (maxOrder.rows[0].max_order || 0) + 1;
    }

    const result = await pool.query(
      `INSERT INTO modules (course_id, title, description, "order")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [courseId, title, description || null, moduleOrder]
    );

    res.status(201).json({
      message: '✅ Module created successfully',
      module: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Create module error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض وحدات الكورس
export const getCourseModules = async (req, res) => {
  try {
    const { courseId } = req.params;

    const modules = await pool.query(
      `SELECT 
        m.*,
        COUNT(DISTINCT l.id) as lessons_count,
        SUM(l.duration) as total_duration
       FROM modules m
       LEFT JOIN lessons l ON m.id = l.module_id
       WHERE m.course_id = $1
       GROUP BY m.id
       ORDER BY m."order" ASC`,
      [courseId]
    );

    res.json({
      message: '✅ Modules fetched',
      modules: modules.rows
    });
  } catch (err) {
    console.error('❌ Get modules error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تحديث وحدة
export const updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, description, order } = req.body;
    const instructorId = req.user.id;

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

    if (moduleCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this module' });
    }

    const result = await pool.query(
      `UPDATE modules
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           "order" = COALESCE($3, "order")
       WHERE id = $4
       RETURNING *`,
      [title, description, order, moduleId]
    );

    res.json({
      message: '✅ Module updated successfully',
      module: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Update module error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// حذف وحدة
export const deleteModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const instructorId = req.user.id;

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

    if (moduleCheck.rows[0].instructor_id !== instructorId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this module' });
    }

    // حذف الوحدة (الدروس ستُحذف تلقائياً بسبب CASCADE)
    await pool.query('DELETE FROM modules WHERE id = $1', [moduleId]);

    res.json({
      message: '✅ Module deleted successfully'
    });
  } catch (err) {
    console.error('❌ Delete module error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};