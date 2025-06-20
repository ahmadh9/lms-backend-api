// controllers/enrollmentController.js
import pool from '../config/db.js';

// تسجيل في كورس
export const enrollInCourse = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.body;

    // التحقق أن المستخدم طالب
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can enroll in courses' });
    }

    // التحقق من وجود الكورس وأنه موافق عليه
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = $1 AND is_approved = true',
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found or not approved' });
    }

    // التحقق من عدم التسجيل المسبق
    const existingEnrollment = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentId, courseId]
    );

    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // إنشاء التسجيل
    const enrollment = await pool.query(
      `INSERT INTO enrollments (user_id, course_id, enrolled_at, progress)
       VALUES ($1, $2, NOW(), 0)
       RETURNING *`,
      [studentId, courseId]
    );

    res.status(201).json({
      message: '✅ Enrolled successfully',
      enrollment: enrollment.rows[0]
    });

  } catch (err) {
    console.error('❌ Enrollment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض كورسات الطالب
export const getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollments = await pool.query(
      `SELECT 
        e.id as enrollment_id,
        e.enrolled_at,
        e.progress,
        e.completed_at,
        c.id as course_id,
        c.title,
        c.description,
        c.thumbnail,
        u.name as instructor_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON c.instructor_id = u.id
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    res.json({
      message: '✅ Enrollments fetched',
      enrollments: enrollments.rows
    });

  } catch (err) {
    console.error('❌ Get enrollments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// عرض طلاب كورس معين (للمدرس)
export const getCourseStudents = async (req, res) => {
  try {
    console.log('🔥 Course Students Route HIT');
    console.log('User:', req.user);
    console.log('CourseId:', req.params.courseId);
    const courseId = req.params.courseId;
    const instructorId = req.user.id;

    // التحقق أن المستخدم هو مدرس الكورس أو أدمن
    if (req.user.role === 'instructor') {
      const courseCheck = await pool.query(
        'SELECT * FROM courses WHERE id = $1 AND instructor_id = $2',
        [courseId, instructorId]
      );

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized to view this course students' });
      }
    }

    const students = await pool.query(
      `SELECT 
        e.id as enrollment_id,
        e.enrolled_at,
        e.progress,
        e.completed_at,
        u.id as student_id,
        u.name as student_name,
        u.email as student_email,
        u.avatar
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       WHERE e.course_id = $1
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    console.log('📦 Found students:', students.rows.length);
    res.json({
      message: '✅ Course students fetched',
      students: students.rows
    });

  } catch (err) {
    console.error('❌ Get course students error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// تحديث تقدم الطالب
export const updateProgress = async (req, res) => {
  try {
    const enrollmentId = req.params.id;
    const studentId = req.user.id;
    const { progress } = req.body;

    // التحقق من صحة قيمة التقدم
    if (progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'Progress must be between 0 and 100' });
    }

    // التحقق أن هذا التسجيل يخص الطالب
    const enrollmentCheck = await pool.query(
      'SELECT * FROM enrollments WHERE id = $1 AND user_id = $2',
      [enrollmentId, studentId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // تحديث التقدم
    const completed_at = progress === 100 ? 'NOW()' : 'NULL';
    
    const updated = await pool.query(
      `UPDATE enrollments 
       SET progress = $1, 
           completed_at = ${progress === 100 ? 'NOW()' : 'NULL'}
       WHERE id = $2
       RETURNING *`,
      [progress, enrollmentId]
    );

    res.json({
      message: '✅ Progress updated',
      enrollment: updated.rows[0]
    });

  } catch (err) {
    console.error('❌ Update progress error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// إحصائيات التسجيل (للأدمن)
export const getEnrollmentStats = async (req, res) => {
  try {
    // إجمالي التسجيلات
    const totalEnrollments = await pool.query(
      'SELECT COUNT(*) as total FROM enrollments'
    );

    // التسجيلات النشطة
    const activeEnrollments = await pool.query(
      'SELECT COUNT(*) as active FROM enrollments WHERE completed_at IS NULL'
    );

    // التسجيلات المكتملة
    const completedEnrollments = await pool.query(
      'SELECT COUNT(*) as completed FROM enrollments WHERE completed_at IS NOT NULL'
    );

    // أكثر الكورسات تسجيلاً
    const popularCourses = await pool.query(
      `SELECT 
        c.id,
        c.title,
        COUNT(e.id) as enrollment_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       GROUP BY c.id, c.title
       ORDER BY enrollment_count DESC
       LIMIT 5`
    );

    res.json({
      message: '✅ Enrollment statistics',
      stats: {
        total: totalEnrollments.rows[0].total,
        active: activeEnrollments.rows[0].active,
        completed: completedEnrollments.rows[0].completed,
        popularCourses: popularCourses.rows
      }
    });

  } catch (err) {
    console.error('❌ Get stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};