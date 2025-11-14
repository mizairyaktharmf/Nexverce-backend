import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllRead
} from "../Controllers/NotificationController.js";

const router = express.Router();

router.get("/", getNotifications);
router.patch("/read/:id", markAsRead);
router.patch("/read-all", markAllRead);

export default router;
