import Career from "../Models/Career.js";

// @desc    Create a new career post
// @route   POST /api/careers
// @access  Private
export const createCareer = async (req, res) => {
  try {
    const {
      title,
      slug,
      department,
      description,
      jobLocation,
      jobType,
      salaryAmount,
      salaryCurrency,
      salaryType,
      image,
      contentBlocks,
      status,
    } = req.body;

    const career = await Career.create({
      title,
      slug,
      department,
      description,
      jobLocation,
      jobType,
      salaryAmount,
      salaryCurrency,
      salaryType,
      image,
      contentBlocks,
      status,
      createdBy: req.user._id,
      publishedAt: status === "published" ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      data: career,
    });
  } catch (error) {
    console.error("Error creating career:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create career post",
    });
  }
};

// @desc    Get all published career posts
// @route   GET /api/careers
// @access  Public
export const getAllCareers = async (req, res) => {
  try {
    const careers = await Career.find({ status: "published" })
      .sort({ createdAt: -1 })
      .select("-createdBy -lastEditedBy");

    res.status(200).json({
      success: true,
      count: careers.length,
      data: careers,
    });
  } catch (error) {
    console.error("Error fetching careers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch career posts",
    });
  }
};

// @desc    Get all career posts (admin - includes drafts)
// @route   GET /api/careers/admin/all
// @access  Private/Admin
export const getAllCareersAdmin = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};

    const careers = await Career.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName email")
      .populate("lastEditedBy", "firstName lastName email");

    res.status(200).json({
      success: true,
      count: careers.length,
      data: careers,
    });
  } catch (error) {
    console.error("Error fetching careers (admin):", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch career posts",
    });
  }
};

// @desc    Get single career post by slug
// @route   GET /api/careers/:slug
// @access  Public
export const getCareerBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const career = await Career.findOne({ slug, status: "published" });

    if (!career) {
      return res.status(404).json({
        success: false,
        message: "Career post not found",
      });
    }

    res.status(200).json({
      success: true,
      data: career,
    });
  } catch (error) {
    console.error("Error fetching career:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch career post",
    });
  }
};

// @desc    Get single career post by ID (admin)
// @route   GET /api/careers/admin/:id
// @access  Private
export const getCareerById = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findById(id)
      .populate("createdBy", "firstName lastName email")
      .populate("lastEditedBy", "firstName lastName email");

    if (!career) {
      return res.status(404).json({
        success: false,
        message: "Career post not found",
      });
    }

    res.status(200).json({
      success: true,
      data: career,
    });
  } catch (error) {
    console.error("Error fetching career:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch career post",
    });
  }
};

// @desc    Update career post
// @route   PUT /api/careers/:id
// @access  Private
export const updateCareer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Set lastEditedBy
    updateData.lastEditedBy = req.user._id;

    // Update publishedAt if status changes to published
    if (updateData.status === "published" && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const career = await Career.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!career) {
      return res.status(404).json({
        success: false,
        message: "Career post not found",
      });
    }

    res.status(200).json({
      success: true,
      data: career,
    });
  } catch (error) {
    console.error("Error updating career:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update career post",
    });
  }
};

// @desc    Delete career post
// @route   DELETE /api/careers/:id
// @access  Private
export const deleteCareer = async (req, res) => {
  try {
    const { id } = req.params;

    const career = await Career.findByIdAndDelete(id);

    if (!career) {
      return res.status(404).json({
        success: false,
        message: "Career post not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Career post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting career:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete career post",
    });
  }
};
