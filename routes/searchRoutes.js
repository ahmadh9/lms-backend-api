// routes/searchRoutes.js
import express from 'express';
import {
  searchCourses,
  filterCourses,
  searchUsers
} from '../controllers/searchController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/courses', searchCourses);
router.get('/courses/filter', filterCourses);
router.get('/users', authenticateToken, authorizeRoles('admin'), searchUsers);

export default router;