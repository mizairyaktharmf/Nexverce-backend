import express from "express";
import { verifyToken } from "../Middleware/AuthMiddleware.js";
import {
  getAllUsers,
  getStaffUsers,
  deleteUser,
} from "../Controllers/UserController.js";

const router = express.Router();

// Get ALL users (admin + staff)
router.get("/all", verifyToken, getAllUsers);

// Get only staff users
router.get("/staffs", verifyToken, getStaffUsers);

// Delete user (optional)
router.delete("/:id", verifyToken, deleteUser);

export default router;
