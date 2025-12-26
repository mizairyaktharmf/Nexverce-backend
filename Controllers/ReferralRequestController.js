import ReferralRequest from "../Models/ReferralRequest.js";
import User from "../Models/User.js";
import { createNotification } from "./NotificationController.js";

// Create a new referral link request
export const createReferralRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postTitle, postDescription, category } = req.body;

    // Validate required fields
    if (!postTitle) {
      return res.status(400).json({ message: "Post title is required" });
    }

    // Get user details for notification
    const user = await User.findById(userId);

    // Create referral request
    const request = await ReferralRequest.create({
      requestedBy: userId,
      postTitle,
      postDescription: postDescription || "",
      category: category || "",
      status: "pending",
    });

    // Populate user details
    await request.populate("requestedBy", "firstName lastName role profileImage");

    console.log(`✅ Referral request created by ${user.firstName} ${user.lastName}`);

    // Send notification to ALL admins
    const io = req.app.get("io");

    // Find all admin users
    const admins = await User.find({ role: "admin" });

    // Send notification to each admin
    for (const admin of admins) {
      await createNotification({
        message: `${user.firstName} ${user.lastName} requested a referral link for "${postTitle}"`,
        type: "info",
        performedBy: user,
        target: {
          id: request._id.toString(),
          title: postTitle,
          model: "ReferralRequest",
        },
        recipientType: "specific",
        recipientUserId: admin._id,
        io,
      });
    }

    res.status(201).json({
      success: true,
      request,
      message: "Referral link request sent to admins",
    });

  } catch (err) {
    console.error("❌ Create referral request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all referral requests (Admin sees all, Staff sees only their own)
export const getReferralRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let requests;

    if (userRole === "admin") {
      // Admins see all requests
      requests = await ReferralRequest.find()
        .populate("requestedBy", "firstName lastName role profileImage")
        .populate("respondedBy", "firstName lastName role profileImage")
        .sort({ createdAt: -1 });
    } else {
      // Staff see only their own requests
      requests = await ReferralRequest.find({ requestedBy: userId })
        .populate("requestedBy", "firstName lastName role profileImage")
        .populate("respondedBy", "firstName lastName role profileImage")
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      requests,
    });

  } catch (err) {
    console.error("❌ Get referral requests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Respond to referral request (Admin only)
export const respondToReferralRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { requestId } = req.params;
    const { status, referralLink, responseNotes } = req.body;

    // Only admins can respond
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Only admins can respond to requests" });
    }

    const request = await ReferralRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Get admin details
    const admin = await User.findById(userId);

    // Update request
    request.status = status;
    request.respondedBy = userId;
    request.respondedAt = new Date();

    if (referralLink) {
      request.referralLink = referralLink;
    }

    if (responseNotes) {
      request.responseNotes = responseNotes;
    }

    await request.save();

    await request.populate("requestedBy", "firstName lastName role profileImage");
    await request.populate("respondedBy", "firstName lastName role profileImage");

    console.log(`✅ Referral request ${status} by ${admin.firstName} ${admin.lastName}`);

    // Send notification to requester
    const io = req.app.get("io");
    await createNotification({
      message: status === "approved"
        ? `Your referral link request for "${request.postTitle}" was approved!`
        : `Your referral link request for "${request.postTitle}" was ${status}`,
      type: status === "approved" ? "info" : "info",
      performedBy: admin,
      target: {
        id: request._id.toString(),
        title: request.postTitle,
        model: "ReferralRequest",
      },
      recipientType: "specific",
      recipientUserId: request.requestedBy._id,
      io,
    });

    res.json({
      success: true,
      request,
      message: "Response sent successfully",
    });

  } catch (err) {
    console.error("❌ Respond to referral request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete referral request
export const deleteReferralRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { requestId } = req.params;

    const request = await ReferralRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Only creator or admin can delete
    if (String(request.requestedBy) !== String(userId) && userRole !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this request" });
    }

    await ReferralRequest.findByIdAndDelete(requestId);

    console.log(`✅ Referral request deleted: "${request.postTitle}"`);

    res.json({
      success: true,
      message: "Request deleted successfully",
    });

  } catch (err) {
    console.error("❌ Delete referral request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
