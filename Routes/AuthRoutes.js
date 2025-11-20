import express from "express";

import {
  signup,
  login,
  verifyEmail,
} from "../Controllers/AuthController.js";

import {
  updateProfile,
  changePassword,
  getUserById,
} from "../Controllers/UserController.js";

import { verifyToken } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

/* ---------------------------------------------
   🔐 Authentication Routes
---------------------------------------------- */

// Signup (only @nexverce.com)
router.post("/signup", signup);

// Login
router.post("/login", login);

// Verify account (email OTP)
router.post("/verify", verifyEmail);

/* ---------------------------------------------
   🔒 Protected Routes
---------------------------------------------- */

// Get logged-in user
router.get("/me", verifyToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// Update profile
router.put("/update-profile", verifyToken, updateProfile);

// Change password
router.post("/change-password", verifyToken, changePassword);

export default router;