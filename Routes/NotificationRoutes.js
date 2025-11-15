// Routes/NotificationRoutes.js
import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllRead
} from "../Controllers/NotificationController.js";

const router = express.Router();

// GET all notifications
router.get("/", getNotifications);

// Mark one as read
router.patch("/read/:id", markAsRead);

// Mark all as read
router.patch("/read-all", markAllRead);

export default router;