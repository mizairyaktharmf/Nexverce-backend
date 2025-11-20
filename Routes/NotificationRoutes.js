import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllRead,
  deleteNotificationForUser,
} from "../Controllers/NotificationController.js";

import { verifyToken } from "../Middleware/AuthMiddleware.js";
import { allowStaffOrAdmin } from "../Middleware/RoleMiddleware.js";

const router = express.Router();

/* ======================================================
   GET ALL NOTIFICATIONS FOR LOGGED-IN USER
====================================================== */
router.get(
  "/",
  verifyToken,
  allowStaffOrAdmin,
  getNotifications
);

/* ======================================================
   MARK SINGLE NOTIFICATION READ
====================================================== */
router.patch(
  "/read/:id",
  verifyToken,
  allowStaffOrAdmin,
  markAsRead
);

/* ======================================================
   MARK ALL NOTIFICATIONS READ
====================================================== */
router.patch(
  "/read-all",
  verifyToken,
  allowStaffOrAdmin,
  markAllRead
);

/* ======================================================
   DELETE NOTIFICATION FOR THE USER ONLY
====================================================== */
router.delete(
  "/delete/:id",
  verifyToken,
  allowStaffOrAdmin,
  deleteNotificationForUser
);

export default router;