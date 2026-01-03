import express from "express";
import {
  createCareer,
  getAllCareers,
  getAllCareersAdmin,
  getCareerBySlug,
  getCareerById,
  updateCareer,
  deleteCareer,
} from "../Controllers/careerController.js";
import { protect } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllCareers);
router.get("/:slug", getCareerBySlug);

// Protected routes (admin)
router.post("/", protect, createCareer);
router.get("/admin/all", protect, getAllCareersAdmin);
router.get("/admin/:id", protect, getCareerById);
router.put("/:id", protect, updateCareer);
router.delete("/:id", protect, deleteCareer);

export default router;
