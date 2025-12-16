import express from "express";
import { verifyToken } from "../Middleware/AuthMiddleware.js";
import { allowStaffOrAdmin } from "../Middleware/RoleMiddleware.js";
import {
  initiateLinkedInAuth,
  handleLinkedInCallback,
  getConnectedAccounts,
  disconnectLinkedInAccount,
  refreshLinkedInToken,
  getLinkedInSettings,
  updateLinkedInSettings,
} from "../Controllers/LinkedInController.js";
import {
  createLinkedInPost,
  getLinkedInPosts,
  getLinkedInPostById,
  deleteLinkedInPost,
  retryFailedPost,
  syncLinkedInAnalytics,
} from "../Controllers/LinkedInPostController.js";

const router = express.Router();

/* ======================================================
   LINKEDIN OAUTH ROUTES
====================================================== */

/**
 * @route   GET /api/linkedin/auth
 * @desc    Initiate LinkedIn OAuth flow
 * @access  Private (Staff/Admin)
 */
router.get("/auth", verifyToken, allowStaffOrAdmin, initiateLinkedInAuth);

/**
 * @route   GET /api/linkedin/callback
 * @desc    Handle LinkedIn OAuth callback
 * @access  Public (OAuth redirect)
 */
router.get("/callback", handleLinkedInCallback);

/**
 * @route   GET /api/linkedin/accounts
 * @desc    Get all connected LinkedIn accounts
 * @access  Private (Staff/Admin)
 */
router.get("/accounts", verifyToken, allowStaffOrAdmin, getConnectedAccounts);

/**
 * @route   DELETE /api/linkedin/accounts/:accountId
 * @desc    Disconnect LinkedIn account
 * @access  Private (Staff/Admin)
 */
router.delete(
  "/accounts/:accountId",
  verifyToken,
  allowStaffOrAdmin,
  disconnectLinkedInAccount
);

/**
 * @route   POST /api/linkedin/accounts/:accountId/refresh
 * @desc    Manually refresh LinkedIn access token
 * @access  Private (Staff/Admin)
 */
router.post(
  "/accounts/:accountId/refresh",
  verifyToken,
  allowStaffOrAdmin,
  refreshLinkedInToken
);

/* ======================================================
   LINKEDIN SETTINGS ROUTES
====================================================== */

/**
 * @route   GET /api/linkedin/settings
 * @desc    Get LinkedIn auto-post settings
 * @access  Private (Staff/Admin)
 */
router.get("/settings", verifyToken, allowStaffOrAdmin, getLinkedInSettings);

/**
 * @route   PUT /api/linkedin/settings
 * @desc    Update LinkedIn auto-post settings
 * @access  Private (Staff/Admin)
 */
router.put("/settings", verifyToken, allowStaffOrAdmin, updateLinkedInSettings);

/* ======================================================
   LINKEDIN POSTING ROUTES
====================================================== */

/**
 * @route   POST /api/linkedin/posts
 * @desc    Create and post to LinkedIn (now or schedule)
 * @access  Private (Staff/Admin)
 * @body    { postId, postType, mode, scheduledAt?, accountId?, customCaption? }
 */
router.post("/posts", verifyToken, allowStaffOrAdmin, createLinkedInPost);

/**
 * @route   GET /api/linkedin/posts
 * @desc    Get all LinkedIn posts with filters
 * @access  Private (Staff/Admin)
 * @query   ?status=posted&postType=blog&limit=50&page=1
 */
router.get("/posts", verifyToken, allowStaffOrAdmin, getLinkedInPosts);

/**
 * @route   GET /api/linkedin/posts/:id
 * @desc    Get single LinkedIn post with analytics
 * @access  Private (Staff/Admin)
 */
router.get("/posts/:id", verifyToken, allowStaffOrAdmin, getLinkedInPostById);

/**
 * @route   DELETE /api/linkedin/posts/:id
 * @desc    Delete LinkedIn post (only draft/scheduled)
 * @access  Private (Staff/Admin)
 */
router.delete("/posts/:id", verifyToken, allowStaffOrAdmin, deleteLinkedInPost);

/**
 * @route   POST /api/linkedin/posts/:id/retry
 * @desc    Retry a failed LinkedIn post
 * @access  Private (Staff/Admin)
 */
router.post("/posts/:id/retry", verifyToken, allowStaffOrAdmin, retryFailedPost);

/**
 * @route   POST /api/linkedin/posts/:id/sync-analytics
 * @desc    Manually sync analytics for a specific post
 * @access  Private (Staff/Admin)
 */
router.post(
  "/posts/:id/sync-analytics",
  verifyToken,
  allowStaffOrAdmin,
  syncLinkedInAnalytics
);

export default router;
