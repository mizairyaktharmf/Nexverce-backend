// Routes/LandingPageRoutes.js
import express from "express";
import {
  getAllLandingPages,
  getLandingPageById,
  getLandingPageBySlug,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  updateLandingPageStatus,
  trackConversion,
  submitLeadCapture,
  getLandingPageAnalytics,
  duplicateLandingPage,
  getLandingPagesByCategory,
} from "../Controllers/LandingPageController.js";

import { protect, restrictTo } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/slug/:slug", getLandingPageBySlug);
router.get("/category/:category", getLandingPagesByCategory);
router.post("/:id/conversion", trackConversion);
router.post("/:id/leads", submitLeadCapture);

// Protected routes (authentication required)
router.use(protect); // All routes below require authentication

// Admin only routes
router.get("/", restrictTo("admin", "superadmin"), getAllLandingPages);
router.post("/", restrictTo("admin", "superadmin"), createLandingPage);

router.get("/:id", restrictTo("admin", "superadmin"), getLandingPageById);
router.put("/:id", restrictTo("admin", "superadmin"), updateLandingPage);
router.delete("/:id", restrictTo("admin", "superadmin"), deleteLandingPage);

router.patch("/:id/status", restrictTo("admin", "superadmin"), updateLandingPageStatus);
router.get("/:id/analytics", restrictTo("admin", "superadmin"), getLandingPageAnalytics);
router.post("/:id/duplicate", restrictTo("admin", "superadmin"), duplicateLandingPage);

export default router;