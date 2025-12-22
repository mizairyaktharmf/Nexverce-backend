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

import { verifyToken } from "../Middleware/AuthMiddleware.js";
import { allowStaffOrAdmin } from "../Middleware/RoleMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/slug/:slug", getLandingPageBySlug);
router.get("/category/:category", getLandingPagesByCategory);
router.get("/careers/all", async (req, res) => {
  try {
    const LandingPage = (await import("../Models/LandingPageModel.js")).default;
    const careers = await LandingPage.find({
      category: "Career",
      status: "active"
    }).sort({ createdAt: -1 });

    res.status(200).json(careers);
  } catch (error) {
    console.error("Error fetching careers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch career posts"
    });
  }
});
router.post("/:id/conversion", trackConversion);
router.post("/:id/leads", submitLeadCapture);

// Protected routes (authentication required for staff/admin)
router.get("/", verifyToken, allowStaffOrAdmin, getAllLandingPages);
router.post("/", verifyToken, allowStaffOrAdmin, createLandingPage);

router.get("/:id", verifyToken, allowStaffOrAdmin, getLandingPageById);
router.put("/:id", verifyToken, allowStaffOrAdmin, updateLandingPage);
router.patch("/:id", verifyToken, allowStaffOrAdmin, updateLandingPageStatus);
router.delete("/:id", verifyToken, allowStaffOrAdmin, deleteLandingPage);

router.get("/:id/analytics", verifyToken, allowStaffOrAdmin, getLandingPageAnalytics);
router.post("/:id/duplicate", verifyToken, allowStaffOrAdmin, duplicateLandingPage);

export default router;