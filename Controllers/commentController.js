import Comment from "../Models/Comment.js";

// @desc    Create a new comment
// @route   POST /api/comments
// @access  Public
export const createComment = async (req, res) => {
  try {
    const { postId, name, email, comment } = req.body;

    // Validation
    if (!postId || !name || !email || !comment) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: postId, name, email, comment"
      });
    }

    // Create comment
    const newComment = await Comment.create({
      postId,
      name,
      email,
      comment,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent")
    });

    res.status(201).json({
      success: true,
      message: "Comment submitted successfully",
      data: newComment
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit comment",
      error: error.message
    });
  }
};

// @desc    Get all comments for a specific post (approved only)
// @route   GET /api/comments/post/:postId
// @access  Public
export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({
      postId,
      status: "approved"
    })
      .select("-ipAddress -userAgent -email") // Don't expose sensitive data
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message
    });
  }
};

// @desc    Get all comments (Admin only - all statuses)
// @route   GET /api/comments
// @access  Private/Admin
export const getAllComments = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Comment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: comments.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: comments
    });
  } catch (error) {
    console.error("Error fetching all comments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comments",
      error: error.message
    });
  }
};

// @desc    Update comment status (approve/reject)
// @route   PUT /api/comments/:id/status
// @access  Private/Admin
export const updateCommentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: pending, approved, or rejected"
      });
    }

    const comment = await Comment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    res.status(200).json({
      success: true,
      message: `Comment ${status} successfully`,
      data: comment
    });
  } catch (error) {
    console.error("Error updating comment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update comment status",
      error: error.message
    });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private/Admin
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByIdAndDelete(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: error.message
    });
  }
};

// @desc    Get comment statistics
// @route   GET /api/comments/stats
// @access  Private/Admin
export const getCommentStats = async (req, res) => {
  try {
    const total = await Comment.countDocuments();
    const approved = await Comment.countDocuments({ status: "approved" });
    const pending = await Comment.countDocuments({ status: "pending" });
    const rejected = await Comment.countDocuments({ status: "rejected" });

    // Get recent comments
    const recentComments = await Comment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name comment postId status createdAt");

    res.status(200).json({
      success: true,
      data: {
        total,
        approved,
        pending,
        rejected,
        recentComments
      }
    });
  } catch (error) {
    console.error("Error fetching comment stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comment statistics",
      error: error.message
    });
  }
};
