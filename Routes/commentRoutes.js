import express from "express";
import {
  createComment,
  getCommentsByPost,
  getAllComments,
  updateCommentStatus,
  deleteComment,
  getCommentStats
} from "../Controllers/commentController.js";
import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/", createComment);
router.get("/post/:postId", getCommentsByPost);

// Admin routes (protected)
router.get("/", protect, getAllComments);
router.get("/stats", protect, getCommentStats);
router.put("/:id/status", protect, updateCommentStatus);
router.delete("/:id", protect, deleteComment);

export default router;
