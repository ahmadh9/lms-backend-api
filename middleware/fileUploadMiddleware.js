// middleware/fileUploadMiddleware.js
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// التأكد من وجود المجلدات
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// إنشاء المجلدات الأساسية
const uploadsDir = path.join(__dirname, '..', 'uploads');
ensureDirectoryExists(uploadsDir);
ensureDirectoryExists(path.join(uploadsDir, 'avatars'));
ensureDirectoryExists(path.join(uploadsDir, 'assignments'));
ensureDirectoryExists(path.join(uploadsDir, 'thumbnails'));
ensureDirectoryExists(path.join(uploadsDir, 'misc'));
ensureDirectoryExists(path.join(uploadsDir, 'videos'));

// إعداد مجلد التخزين
const storage = multer.diskStorage({
 destination: (req, file, cb) => {
  let uploadPath = path.join(__dirname, '..', 'uploads');

  // يشمل كل الاحتمالات
  if (file.fieldname === 'avatar') {
    uploadPath = path.join(uploadPath, 'avatars');
  } else if (file.fieldname === 'assignment' || file.fieldname === 'assignmentFile') {
    uploadPath = path.join(uploadPath, 'assignments');
  } else if (file.fieldname === 'courseThumbnail') {
    uploadPath = path.join(uploadPath, 'thumbnails');
  } else if (file.fieldname === 'lessonVideo') {
  uploadPath = path.join(uploadPath, 'videos');
} else {
    uploadPath = path.join(uploadPath, 'misc');
  }

  ensureDirectoryExists(uploadPath);
  cb(null, uploadPath);
},
  filename: (req, file, cb) => {
    // الحفاظ على امتداد الملف الأصلي
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});
// فلترة أنواع الملفات
const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    avatar: ['image/jpeg', 'image/png', 'image/gif'],
    courseThumbnail: ['image/jpeg', 'image/png', 'image/gif'],
    assignment: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'text/plain',
      'application/javascript',
      'text/html',
      'text/css'
    ]
  };

  const allowedTypes = allowedMimes[file.fieldname] || allowedMimes.assignment;
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};
export const uploadLessonVideo = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only MP4, WebM, or OGG videos allowed'), false);
  }
}).single('lessonVideo');

// إعدادات Multer
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
}).single('avatar');

// ...
export const uploadAssignment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
}).fields([
  { name: 'assignmentFile', maxCount: 1 }
]);
// ...


export const uploadCourseThumbnail = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
}).single('courseThumbnail');

// Middleware للتعامل مع أخطاء الرفع
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};