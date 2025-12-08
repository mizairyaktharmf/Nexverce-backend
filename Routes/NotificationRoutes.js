import express from "express";
import {
  getNotifications,
  getUserNotifications,
  createNotificationAPI,
  markAsRead,
  markAllRead,
  deleteNotificationForUser,
} from "../Controllers/NotificationController.js";

import { verifyToken } from "../Middleware/AuthMiddleware.js";
import { allowStaffOrAdmin } from "../Middleware/RoleMiddleware.js";

const router = express.Router();

/* ======================================================
   GET ALL NOTIFICATIONS FOR LOGGED-IN USER (Legacy)
====================================================== */
router.get(
  "/",
  verifyToken,
  allowStaffOrAdmin,
  getNotifications
);

/* ======================================================
   GET USER-SPECIFIC NOTIFICATIONS
====================================================== */
router.get(
  "/user/:userId",
  verifyToken,
  allowStaffOrAdmin,
  getUserNotifications
);

/* ======================================================
   CREATE NOTIFICATION (Frontend can call this)
====================================================== */
router.post(
  "/",
  verifyToken,
  allowStaffOrAdmin,
  createNotificationAPI
);

/* ======================================================
   MARK SINGLE NOTIFICATION READ (User-specific)
====================================================== */
router.patch(
  "/:id/read",
  verifyToken,
  allowStaffOrAdmin,
  markAsRead
);

/* ======================================================
   MARK ALL NOTIFICATIONS READ (User-specific)
====================================================== */
router.patch(
  "/user/:userId/read-all",
  verifyToken,
  allowStaffOrAdmin,
  markAllRead
);

/* ======================================================
   HIDE/DELETE NOTIFICATION FOR USER ONLY (Soft delete)
====================================================== */
router.patch(
  "/:id/hide",
  verifyToken,
  allowStaffOrAdmin,
  deleteNotificationForUser
);

export default router;