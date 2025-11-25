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
  getUserActivity,   // ⭐ FIX → You forgot to import this
} from "../Controllers/UserController.js";

const router = express.Router();

/* ======================================================
   GET ALL USERS (ADMIN ONLY)
====================================================== */
router.get("/all", verifyToken, allowAdmin, getAllUsers);

/* ======================================================
   GET ALL STAFF (ADMIN ONLY)
====================================================== */
router.get("/staffs", verifyToken, allowAdmin, getStaffUsers);

/* ======================================================
   ⭐ GET USER ACTIVITY LOGS (ADMIN ONLY)
   (placed BEFORE :id route to avoid conflict)
====================================================== */
router.get("/activity/:id", verifyToken, allowAdmin, getUserActivity);

/* ======================================================
   GET SINGLE USER (ADMIN ONLY)
====================================================== */
router.get("/:id", verifyToken, allowAdmin, getUserById);

/* ======================================================
   UPDATE USER ROLE (ADMIN ONLY)
====================================================== */
router.put("/:id/role", verifyToken, allowAdmin, updateUserRole);

/* ======================================================
   DELETE USER (ADMIN ONLY)
====================================================== */
router.delete("/:id", verifyToken, allowAdmin, deleteUser);

export default router;
