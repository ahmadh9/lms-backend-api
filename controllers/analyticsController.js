// controllers/analyticsController.js
import pool from '../config/db.js';

// Dashboard عام
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let dashboardData = {};

    if (userRole === 'admin') {
      // إحصائيات الأدمن
      const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
      const totalCourses = await pool.query('SELECT COUNT(*) FROM courses');
      const totalEnrollments = await pool.query('SELECT COUNT(*) FROM enrollments');
      const pendingCourses = await pool.query('SELECT COUNT(*) FROM courses WHERE status = $1', ['pending']);
      // المستخدمين الجدد آخر 30 يوم
      const newUsers = await pool.query(`
        SELECT COUNT(*) FROM users 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      // الكورسات الأكثر شعبية
      const popularCourses = await pool.query(`
        SELECT c.id, c.title, COUNT(e.id) as enrollment_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        GROUP BY c.id
        ORDER BY enrollment_count DESC
        LIMIT 5
      `);

      dashboardData = {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalCourses: parseInt(totalCourses.rows[0].count),
        totalEnrollments: parseInt(totalEnrollments.rows[0].count),
        pendingCourses: parseInt(pendingCourses.rows[0].count),
        newUsersLast30Days: parseInt(newUsers.rows[0].count),
        popularCourses: popularCourses.rows
      };

    } else if (userRole === 'instructor') {
      // إحصائيات المدرس
      const myCourses = await pool.query(
        'SELECT COUNT(*) FROM courses WHERE instructor_id = $1',
        [userId]
      );

      const totalStudents = await pool.query(`
        SELECT COUNT(DISTINCT e.user_id) 
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE c.instructor_id = $1
      `, [userId]);

      const pendingAssignments = await pool.query(`
        SELECT COUNT(*) 
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN lessons l ON a.lesson_id = l.id
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        WHERE c.instructor_id = $1 AND s.grade IS NULL
      `, [userId]);

      // كورساتي مع عدد الطلاب
      const coursesWithStudents = await pool.query(`
        SELECT c.id, c.title, COUNT(e.id) as student_count
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.instructor_id = $1
        GROUP BY c.id
      `, [userId]);

      dashboardData = {
        totalCourses: parseInt(myCourses.rows[0].count),
        totalStudents: parseInt(totalStudents.rows[0].count),
        pendingAssignments: parseInt(pendingAssignments.rows[0].count),
        courses: coursesWithStudents.rows
      };

    } else if (userRole === 'student') {
      // إحصائيات الطالب
      const enrolledCourses = await pool.query(
        'SELECT COUNT(*) FROM enrollments WHERE user_id = $1',
        [userId]
      );

      const completedCourses = await pool.query(
        'SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND completed_at IS NOT NULL',
        [userId]
      );

      const averageProgress = await pool.query(
        'SELECT AVG(progress) as avg_progress FROM enrollments WHERE user_id = $1',
        [userId]
      );

      // آخر الأنشطة
      const recentActivity = await pool.query(`
        SELECT c.title, e.progress, e.enrolled_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = $1
        ORDER BY e.enrolled_at DESC
        LIMIT 5
      `, [userId]);

      dashboardData = {
        enrolledCourses: parseInt(enrolledCourses.rows[0].count),
        completedCourses: parseInt(completedCourses.rows[0].count),
        averageProgress: Math.round(averageProgress.rows[0].avg_progress || 0),
        recentActivity: recentActivity.rows
      };
    }

    res.json({
      message: '✅ Dashboard data fetched',
      role: userRole,
      data: dashboardData
    });

  } catch (err) {
    console.error('❌ Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// أداء طالب معين
export const getStudentPerformance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const requesterId = req.user.id;
    const requesterRole = req.user.role;

    // التحقق من الصلاحيات
    if (requesterRole === 'student' && requesterId !== parseInt(studentId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // معلومات الطالب
    const studentInfo = await pool.query(
      'SELECT id, name, email, avatar FROM users WHERE id = $1 AND role = $2',
      [studentId, 'student']
    );

    if (studentInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // الكورسات المسجل فيها
    const enrollments = await pool.query(`
      SELECT 
        e.*,
        c.title as course_title,
        c.description as course_description,
        u.name as instructor_name
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC
    `, [studentId]);

    // نتائج الاختبارات (يحتاج جدول quiz_attempts)
    // الواجبات المسلمة
    const submissions = await pool.query(`
      SELECT 
        s.*,
        a.title as assignment_title,
        c.title as course_title
      FROM submissions s
      JOIN assignments a ON s.assignment_id = a.id
      JOIN lessons l ON a.lesson_id = l.id
      JOIN modules m ON l.module_id = m.id
      JOIN courses c ON m.course_id = c.id
      WHERE s.user_id = $1
      ORDER BY s.submitted_at DESC
    `, [studentId]);

    // متوسط الدرجات
    const averageGrade = await pool.query(
      'SELECT AVG(grade) as avg_grade FROM submissions WHERE user_id = $1 AND grade IS NOT NULL',
      [studentId]
    );

    res.json({
      message: '✅ Student performance fetched',
      student: studentInfo.rows[0],
      performance: {
        enrollments: enrollments.rows,
        submissions: submissions.rows,
        averageGrade: Math.round(averageGrade.rows[0].avg_grade || 0),
        totalCourses: enrollments.rows.length,
        completedCourses: enrollments.rows.filter(e => e.completed_at).length
      }
    });

  } catch (err) {
    console.error('❌ Student performance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// إحصائيات كورس معين
// إحصائيات كورس معين
export const getCourseStatistics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // معلومات الكورس
    const courseInfo = await pool.query(`
      SELECT c.*, u.name as instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = $1
    `, [courseId]);

    if (courseInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const course = courseInfo.rows[0];

    // التحقق من الصلاحيات
    if (userRole === 'instructor' && course.instructor_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // إحصائيات عامة
    const totalStudents = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE course_id = $1',
      [courseId]
    );

    const completedStudents = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE course_id = $1 AND completed_at IS NOT NULL',
      [courseId]
    );

    const averageProgress = await pool.query(
      'SELECT AVG(progress) as avg_progress FROM enrollments WHERE course_id = $1',
      [courseId]
    );

    // عدد الوحدات والدروس
    const moduleCount = await pool.query(
      'SELECT COUNT(*) FROM modules WHERE course_id = $1',
      [courseId]
    );

    const lessonCount = await pool.query(`
      SELECT COUNT(*) 
      FROM lessons l
      JOIN modules m ON l.module_id = m.id
      WHERE m.course_id = $1
    `, [courseId]);

    // توزيع التقدم - نسخة مصححة
    const progressDistribution = await pool.query(`
      WITH progress_groups AS (
        SELECT 
          CASE 
            WHEN progress = 0 THEN 'لم يبدأ'
            WHEN progress BETWEEN 1 AND 25 THEN '1-25%'
            WHEN progress BETWEEN 26 AND 50 THEN '26-50%'
            WHEN progress BETWEEN 51 AND 75 THEN '51-75%'
            WHEN progress BETWEEN 76 AND 99 THEN '76-99%'
            WHEN progress = 100 THEN 'مكتمل'
          END as progress_range,
          CASE 
            WHEN progress = 0 THEN 1
            WHEN progress BETWEEN 1 AND 25 THEN 2
            WHEN progress BETWEEN 26 AND 50 THEN 3
            WHEN progress BETWEEN 51 AND 75 THEN 4
            WHEN progress BETWEEN 76 AND 99 THEN 5
            WHEN progress = 100 THEN 6
          END as sort_order
        FROM enrollments
        WHERE course_id = $1
      )
      SELECT 
        progress_range,
        COUNT(*) as student_count
      FROM progress_groups
      GROUP BY progress_range, sort_order
      ORDER BY sort_order
    `, [courseId]);

    res.json({
      message: '✅ Course statistics fetched',
      course: course,
      statistics: {
        totalStudents: parseInt(totalStudents.rows[0].count),
        completedStudents: parseInt(completedStudents.rows[0].count),
        averageProgress: Math.round(averageProgress.rows[0].avg_progress || 0),
        completionRate: totalStudents.rows[0].count > 0 
          ? Math.round((completedStudents.rows[0].count / totalStudents.rows[0].count) * 100)
          : 0,
        moduleCount: parseInt(moduleCount.rows[0].count),
        lessonCount: parseInt(lessonCount.rows[0].count),
        progressDistribution: progressDistribution.rows
      }
    });

  } catch (err) {
    console.error('❌ Course statistics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// كورسات المدرس
export const getInstructorCourses = async (req, res) => {
  try {
    const { instructorId } = req.params;

    // معلومات المدرس
    const instructorInfo = await pool.query(
      'SELECT id, name, email, avatar FROM users WHERE id = $1 AND role = $2',
      [instructorId, 'instructor']
    );

    if (instructorInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // كورسات المدرس مع الإحصائيات
    const courses = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT e.id) as student_count,
        AVG(e.progress) as avg_progress,
        COUNT(DISTINCT m.id) as module_count,
        COUNT(DISTINCT l.id) as lesson_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN modules m ON c.id = m.course_id
      LEFT JOIN lessons l ON m.id = l.module_id
      WHERE c.instructor_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [instructorId]);

    // إجمالي الطلاب
    const totalStudents = await pool.query(`
      SELECT COUNT(DISTINCT e.user_id)
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE c.instructor_id = $1
    `, [instructorId]);

    res.json({
      message: '✅ Instructor courses fetched',
      instructor: instructorInfo.rows[0],
      courses: courses.rows,
      totalStudents: parseInt(totalStudents.rows[0].count),
      totalCourses: courses.rows.length
    });

  } catch (err) {
    console.error('❌ Instructor courses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};