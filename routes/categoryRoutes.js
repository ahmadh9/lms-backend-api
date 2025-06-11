// routes/categoryRoutes.js
import express from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  searchCategories
} from '../controllers/categoryController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// عامة - أي شخص يمكنه رؤية التصنيفات
router.get('/', getAllCategories);
router.get('/search', searchCategories);
router.get('/:id', getCategoryById);

// أدمن فقط
router.post('/', authenticateToken, authorizeRoles('admin'), createCategory);
router.put('/:id', authenticateToken, authorizeRoles('admin'), updateCategory);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteCategory);

export default router;