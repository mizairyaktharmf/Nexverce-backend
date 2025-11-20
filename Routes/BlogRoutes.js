import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  changeBlogStatus,
  scheduleBlog,
} from "../Controllers/BlogController.js";

import { verifyToken } from "../Middleware/AuthMiddleware.js";
import {
  allowStaffOrAdmin,
} from "../Middleware/RoleMiddleware.js";

const router = express.Router();

/* =============== PUBLIC (client website) =============== */
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);

/* =============== PROTECTED (admin panel) =============== */

// create
router.post("/", verifyToken, allowStaffOrAdmin, createBlog);

// update
router.put("/:id", verifyToken, allowStaffOrAdmin, updateBlog);

// change status
router.patch("/:id/status", verifyToken, allowStaffOrAdmin, changeBlogStatus);

// schedule
router.patch("/:id/schedule", verifyToken, allowStaffOrAdmin, scheduleBlog);

// delete
router.delete("/:id", verifyToken, allowStaffOrAdmin, deleteBlog);

export default router;
