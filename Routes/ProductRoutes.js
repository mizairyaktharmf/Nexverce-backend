import express from "express";
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  changeStatus,
  schedulePost,
} from "../Controllers/ProductController.js";

import { verifyToken } from "../Middleware/AuthMiddleware.js";
import {
  allowAdmin,
  allowStaffOrAdmin,
} from "../Middleware/RoleMiddleware.js";

const router = express.Router();

/* ======================================================
   PUBLIC ROUTES (Client website)
====================================================== */
router.get("/", getAllPosts);          // All posts
router.get("/:id", getPostById);       // Single post

/* ======================================================
   PROTECTED (Admin Panel)
====================================================== */

// CREATE NEW POST (admin & staff)
router.post("/", verifyToken, allowStaffOrAdmin, createPost);

// UPDATE POST COMPLETELY
router.put("/:id", verifyToken, allowStaffOrAdmin, updatePost);

// PATCH — STATUS, SCHEDULE
router.patch("/:id/status", verifyToken, allowStaffOrAdmin, changeStatus);
router.patch("/:id/schedule", verifyToken, allowStaffOrAdmin, schedulePost);

// DELETE POST (Admins only)
router.delete("/:id", verifyToken, allowAdmin, deletePost);

export default router;