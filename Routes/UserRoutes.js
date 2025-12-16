import express from "express";
import { verifyToken } from "../Middleware/AuthMiddleware.js";
import {
  allowAdmin,
  allowStaffOrAdmin,
} from "../Middleware/RoleMiddleware.js";

import {
  getAllUsers,
  getStaffUsers,
  deleteUser,
  getUserById,
  updateUserRole,
  getUserActivity,   // ⭐ VIEW SPECIFIC USER LOGIN HISTORY
  updatePresence,    // ⭐ ONLINE HEARTBEAT
  getLoginStatistics, // ⭐ GET LOGIN STATS (EARLY/LATE)
  suspendUser,       // ⭐ SUSPEND/UNSUSPEND USER
  forceLogout,       // ⭐ FORCE LOGOUT USER
} from "../Controllers/UserController.js";

const router = express.Router();

/* ======================================================
   ⭐ ONLINE PRESENCE HEARTBEAT
   STAFF + ADMIN CAN UPDATE LAST SEEN
====================================================== */
router.post("/heartbeat", verifyToken, allowStaffOrAdmin, updatePresence);

/* ======================================================
   ⭐ GET LOGIN STATISTICS (STAFF + ADMIN)
   EARLY/LATE LOGIN COUNTS FOR DASHBOARD
====================================================== */
router.get("/login-statistics", verifyToken, allowStaffOrAdmin, getLoginStatistics);

/* ======================================================
   ⭐ USER ACTIVITY LOGS (ADMIN ONLY)
   MUST COME BEFORE "/:id" ROUTE
====================================================== */
router.get("/activity/:id", verifyToken, allowAdmin, getUserActivity);

/* ======================================================
   GET ALL USERS (STAFF + ADMIN)
   READ-ONLY ACCESS FOR DASHBOARD STATISTICS
====================================================== */
router.get("/all", verifyToken, allowStaffOrAdmin, getAllUsers);

/* ======================================================
   GET ALL STAFF (ADMIN ONLY)
====================================================== */
router.get("/staffs", verifyToken, allowAdmin, getStaffUsers);

/* ======================================================
   GET USERS FOR MESSAGING (STAFF + ADMIN)
====================================================== */
router.get("/messaging/users", verifyToken, allowStaffOrAdmin, getAllUsers);

/* ======================================================
   GET SINGLE USER (ADMIN ONLY)
====================================================== */
router.get("/:id", verifyToken, allowAdmin, getUserById);

/* ======================================================
   UPDATE USER ROLE (ADMIN ONLY)
====================================================== */
router.put("/:id/role", verifyToken, allowAdmin, updateUserRole);

/* ======================================================
   SUSPEND/UNSUSPEND USER (ADMIN ONLY)
====================================================== */
router.put("/suspend/:id", verifyToken, allowAdmin, suspendUser);

/* ======================================================
   FORCE LOGOUT USER (ADMIN ONLY)
====================================================== */
router.post("/force-logout/:id", verifyToken, allowAdmin, forceLogout);

/* ======================================================
   DELETE USER (ADMIN ONLY)
====================================================== */
router.delete("/:id", verifyToken, allowAdmin, deleteUser);

export default router;
