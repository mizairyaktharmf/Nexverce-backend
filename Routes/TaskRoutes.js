import express from "express";
import { protect } from "../Middleware/AuthMiddleware.js";

import {
  createTask,
  getMyTasks,
  getTaskById,
  updateTaskStatus,
  updateTask,
  deleteTask,
  markTaskAsRead,
  getTaskStats,
} from "../Controllers/TaskController.js";

const router = express.Router();

// Create task (Admin only)
router.post("/create", protect, createTask);

// Get all tasks for current user
router.get("/my-tasks", protect, getMyTasks);

// Get task statistics (Admin only)
router.get("/stats", protect, getTaskStats);

// Get specific task by ID
router.get("/:taskId", protect, getTaskById);

// Update task status
router.patch("/:taskId/status", protect, updateTaskStatus);

// Update task details (Admin only)
router.put("/:taskId", protect, updateTask);

// Delete task (Admin only)
router.delete("/:taskId", protect, deleteTask);

// Mark task as read
router.patch("/:taskId/read", protect, markTaskAsRead);

export default router;
