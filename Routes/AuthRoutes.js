import express from "express";

import {
  signup,
  login,
  verifyEmail,
  logoutUser,     // ⭐ Added logout controller
} from "../Controllers/AuthController.js";

import {
  updateProfile,
  changePassword,
  getUserById,
} from "../Controllers/UserController.js";

import { verifyToken } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

/* ---------------------------------------------
   🔐 AUTH ROUTES
---------------------------------------------- */

// Signup (only @nexverce.com)
router.post("/signup", signup);

// Login
router.post("/login", login);

// Verify account via OTP
router.post("/verify", verifyEmail);


/* ---------------------------------------------
   🔒 PROTECTED ROUTES (must be logged in)
---------------------------------------------- */

// Get logged-in user (used by frontend auto-refresh)
router.get("/me", verifyToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user, // comes from AuthMiddleware
  });
});

// Update profile
router.put("/update-profile", verifyToken, updateProfile);

// Change password
router.post("/change-password", verifyToken, changePassword);

// NEW: Logout (marks user offline, saves logout time)
router.post("/logout", verifyToken, logoutUser);


/* ---------------------------------------------
   EXPORT ROUTER
---------------------------------------------- */

export default router;
