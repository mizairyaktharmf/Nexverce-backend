// Controllers/LandingPageController.js
import LandingPage from "../Models/LandingPageModel.js";
import { createNotification } from "./NotificationController.js";

// @desc    Get all landing pages
// @route   GET /api/landing-pages
// @access  Private (Admin)
export const getAllLandingPages = async (req, res) => {
  try {
    const { status, category, campaign } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (campaign) filter["campaign.source"] = campaign;

    const landingPages = await LandingPage.find(filter)
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: landingPages.length,
      data: landingPages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch landing pages",
      error: error.message,
    });
  }
};

// @desc    Get single landing page by ID
// @route   GET /api/landing-pages/:id
// @access  Private (Admin)
export const getLandingPageById = async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id)
      .populate("createdBy", "firstName lastName email")
      .populate("lastEditedBy", "firstName lastName email");

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    res.status(200).json({
      success: true,
      data: landingPage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch landing page",
      error: error.message,
    });
  }
};

// @desc    Get landing page by slug (Public - for frontend display)
// @route   GET /api/landing-pages/slug/:slug
// @access  Public
export const getLandingPageBySlug = async (req, res) => {
  try {
    const landingPage = await LandingPage.findOne({ slug: req.params.slug });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    // Check if landing page is active
    if (landingPage.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Landing page is not active",
      });
    }

    // Increment view count
    await landingPage.incrementView();

    res.status(200).json({
      success: true,
      data: landingPage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch landing page",
      error: error.message,
    });
  }
};

// @desc    Create new landing page
// @route   POST /api/landing-pages
// @access  Private (Admin)
export const createLandingPage = async (req, res) => {
  try {
    // Add createdBy from authenticated user
    req.body.createdBy = req.user._id || req.user.id;

    const landingPage = await LandingPage.create(req.body);

    await createNotification({
      message: `created landing page "${landingPage.title}" as ${landingPage.status}`,
      type: landingPage.status,
      performedBy: req.user,
      target: {
        id: landingPage._id,
        title: landingPage.title,
        model: "LandingPage",
      },
      io: req.app.get("io"),
    });

    res.status(201).json({
      success: true,
      message: "Landing page created successfully",
      data: landingPage,
    });
  } catch (error) {
    // Handle duplicate slug error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Landing page with this slug already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create landing page",
      error: error.message,
    });
  }
};

// @desc    Update landing page
// @route   PUT /api/landing-pages/:id
// @access  Private (Admin)
export const updateLandingPage = async (req, res) => {
  try {
    // Add lastEditedBy
    req.body.lastEditedBy = req.user._id || req.user.id;

    const landingPage = await LandingPage.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    await createNotification({
      message: `updated landing page "${landingPage.title}"`,
      type: "update",
      performedBy: req.user,
      target: {
        id: landingPage._id,
        title: landingPage.title,
        model: "LandingPage",
      },
      io: req.app.get("io"),
    });

    res.status(200).json({
      success: true,
      message: "Landing page updated successfully",
      data: landingPage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update landing page",
      error: error.message,
    });
  }
};

// @desc    Delete landing page
// @route   DELETE /api/landing-pages/:id
// @access  Private (Admin)
export const deleteLandingPage = async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    const pageTitle = landingPage.title;
    await landingPage.deleteOne();

    await createNotification({
      message: `deleted landing page "${pageTitle}"`,
      type: "delete",
      performedBy: req.user,
      target: {
        id: landingPage._id,
        title: pageTitle,
        model: "LandingPage",
      },
      io: req.app.get("io"),
    });

    res.status(200).json({
      success: true,
      message: "Landing page deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete landing page",
      error: error.message,
    });
  }
};

// @desc    Update landing page status
// @route   PATCH /api/landing-pages/:id/status
// @access  Private (Admin)
export const updateLandingPageStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["draft", "active", "paused", "ended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const updateData = { status };

    // Update timestamps based on status
    if (status === "active") updateData.publishedAt = new Date();
    if (status === "paused") updateData.pausedAt = new Date();
    if (status === "ended") updateData.endedAt = new Date();

    const landingPage = await LandingPage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    await createNotification({
      message: `marked landing page "${landingPage.title}" as ${status}`,
      type: status,
      performedBy: req.user,
      target: {
        id: landingPage._id,
        title: landingPage.title,
        model: "LandingPage",
      },
      io: req.app.get("io"),
    });

    res.status(200).json({
      success: true,
      message: `Landing page ${status}`,
      data: landingPage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

// @desc    Track conversion
// @route   POST /api/landing-pages/:id/conversion
// @access  Public
export const trackConversion = async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    await landingPage.trackConversion();

    res.status(200).json({
      success: true,
      message: "Conversion tracked successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to track conversion",
      error: error.message,
    });
  }
};

// @desc    Submit lead capture form
// @route   POST /api/landing-pages/:id/leads
// @access  Public
export const submitLeadCapture = async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    // Track as conversion
    await landingPage.trackConversion();

    // Here you can add logic to:
    // 1. Save lead to database
    // 2. Send email notification
    // 3. Integrate with CRM
    // 4. Send to email marketing service

    const leadData = req.body;

    // TODO: Save lead to database (create Lead model)
    // TODO: Send email notification if configured
    // TODO: Integrate with third-party services

    res.status(200).json({
      success: true,
      message: landingPage.leadCapture.successMessage,
      redirectUrl: landingPage.leadCapture.redirectUrl,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit lead",
      error: error.message,
    });
  }
};

// @desc    Get landing page analytics
// @route   GET /api/landing-pages/:id/analytics
// @access  Private (Admin)
export const getLandingPageAnalytics = async (req, res) => {
  try {
    const landingPage = await LandingPage.findById(req.params.id);

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        landingPageId: landingPage._id,
        title: landingPage.title,
        slug: landingPage.slug,
        status: landingPage.status,
        analytics: landingPage.analytics,
        campaign: landingPage.campaign,
        createdAt: landingPage.createdAt,
        publishedAt: landingPage.publishedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};

// @desc    Duplicate landing page
// @route   POST /api/landing-pages/:id/duplicate
// @access  Private (Admin)
export const duplicateLandingPage = async (req, res) => {
  try {
    const originalPage = await LandingPage.findById(req.params.id);

    if (!originalPage) {
      return res.status(404).json({
        success: false,
        message: "Landing page not found",
      });
    }

    // Create a copy with modified slug and title
    const duplicateData = originalPage.toObject();
    delete duplicateData._id;
    delete duplicateData.__v;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.slug = `${duplicateData.slug}-copy-${Date.now()}`;
    duplicateData.status = "draft";
    duplicateData.createdBy = req.user._id || req.user.id;
    duplicateData.analytics = {
      views: 0,
      uniqueVisitors: 0,
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      bounceRate: 0,
      avgTimeOnPage: 0,
      revenue: 0,
    };

    const duplicatedPage = await LandingPage.create(duplicateData);

    res.status(201).json({
      success: true,
      message: "Landing page duplicated successfully",
      data: duplicatedPage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to duplicate landing page",
      error: error.message,
    });
  }
};

// @desc    Get landing pages by category
// @route   GET /api/landing-pages/category/:category
// @access  Public
export const getLandingPagesByCategory = async (req, res) => {
  try {
    const landingPages = await LandingPage.getByCategory(req.params.category);

    res.status(200).json({
      success: true,
      count: landingPages.length,
      data: landingPages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch landing pages",
      error: error.message,
    });
  }
};