// routes/reviewRoutes.js
import express from 'express';
import {
  createReview,
  getCourseReviews,
  updateReview,
  deleteReview
} from '../controllers/reviewController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/course/:courseId', authenticateToken, createReview);
router.get('/course/:courseId', getCourseReviews);
router.put('/:reviewId', authenticateToken, updateReview);
router.delete('/:reviewId', authenticateToken, deleteReview);

export default router;