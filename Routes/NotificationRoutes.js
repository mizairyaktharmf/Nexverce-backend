// Routes/NotificationRoutes.js
import express from "express";
import {
  getNotifications,
  createNotificationAPI,
  markAsRead,
  markAllRead,
} from "../Controllers/NotificationController.js";

const router = express.Router();

// Create notification (frontend or system call)
router.post("/", createNotificationAPI);

// Get all notifications
router.get("/", getNotifications);

// Mark single as read
router.patch("/read/:id", markAsRead);

// Mark all as read
router.patch("/read-all", markAllRead);

export default router;