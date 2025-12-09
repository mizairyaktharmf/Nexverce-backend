import Notification from "../Models/Notification.js";

/* ============================================================
   CREATE NOTIFICATION (Reusable Everywhere)
============================================================ */
export const createNotification = async ({
  message,
  type = "info",
  performedBy,
  target,
  recipientType = "all",
  recipientUserId = null,
  io = null, // Optional Socket.IO instance for real-time updates
}) => {
  try {
    // Validate required fields
    if (!performedBy || !performedBy._id) {
      console.error("❌ createNotification: performedBy is missing or invalid");
      return null;
    }

    const newNotification = await Notification.create({
      message,
      type,

      // FIXED: _id instead of id
      performedBy: {
        userId: performedBy._id,
        name: `${performedBy.firstName} ${performedBy.lastName}`,
        role: performedBy.role,
      },

      target,
      recipientType,
      recipientUserId,
    });

    console.log(`📝 Notification created in DB: ${message}`);

    // Emit real-time notification to relevant users
    if (io) {
      const notificationData = {
        ...newNotification.toObject(),
        read: false,
        user: newNotification.performedBy?.name || "System",
      };

      if (recipientType === "specific" && recipientUserId) {
        // Emit only to specific user (e.g., profile updates)
        io.to(`user_${recipientUserId}`).emit("notification:new", notificationData);
        console.log(`✅ Notification emitted to user_${recipientUserId}: ${message}`);
      } else {
        // Emit to all users (e.g., product/blog/landing page actions)
        io.emit("notification:new", notificationData);
        console.log(`✅ Notification emitted to ALL users: ${message}`);
      }
    } else {
      console.warn(`⚠️ Socket.IO not available - notification created but not emitted: ${message}`);
    }

    return newNotification;
  } catch (err) {
    console.error("❌ Notification create failed:", err.message);
    console.error("Stack:", err.stack);
    return null;
  }
};

/* ============================================================
   GET NOTIFICATIONS FOR CURRENT USER (Legacy - kept for compatibility)
============================================================ */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notes = await Notification.find({
      deletedBy: { $ne: userId },
      $or: [
        { recipientType: "all" },
        { recipientType: "specific", recipientUserId: userId },
      ],
    }).sort({ createdAt: -1 });

    // Add read status for this user
    const notesWithReadStatus = notes.map(note => ({
      ...note.toObject(),
      read: note.readBy.includes(userId),
      user: note.performedBy?.name || "System", // Format for frontend
    }));

    return res.json(notesWithReadStatus);
  } catch (err) {
    console.log("❌ Get Notifications Error:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/* ============================================================
   GET USER-SPECIFIC NOTIFICATIONS (New - for frontend)
============================================================ */
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all notifications NOT deleted by this user
    const notes = await Notification.find({
      deletedBy: { $ne: userId },
      $or: [
        { recipientType: "all" },
        { recipientType: "specific", recipientUserId: userId },
      ],
    }).sort({ createdAt: -1 });

    // Add read status for this specific user
    const notesWithReadStatus = notes.map(note => ({
      ...note.toObject(),
      read: note.readBy.includes(userId), // true if user is in readBy array
      user: note.performedBy?.name || "System", // Format for frontend
    }));

    return res.json(notesWithReadStatus);
  } catch (err) {
    console.log("❌ Get User Notifications Error:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/* ============================================================
   CREATE NOTIFICATION FROM FRONTEND
============================================================ */
export const createNotificationAPI = async (req, res) => {
  try {
    const { message, type = "info", user, userId } = req.body;

    // Get user info from token
    const currentUser = req.user;

    const newNotification = await Notification.create({
      message,
      type,
      performedBy: {
        userId: userId || currentUser._id,
        name: user || `${currentUser.firstName} ${currentUser.lastName}`,
        role: currentUser.role,
      },
      recipientType: "all", // All users see it
      readBy: [], // No one has read it yet
      deletedBy: [], // No one has deleted it yet
    });

    // Emit real-time notification to all connected users
    const io = req.app.get("io");
    if (io) {
      io.emit("notification:new", {
        ...newNotification.toObject(),
        read: false,
        user: newNotification.performedBy?.name || "System",
      });
    }

    return res.json(newNotification);
  } catch (err) {
    console.log("❌ Create Notification Error:", err);
    return res.status(500).json({ error: "Failed to create notification" });
  }
};

/* ============================================================
   MARK ONE NOTIFICATION AS READ (User-specific)
============================================================ */
export const markAsRead = async (req, res) => {
  try {
    // Get userId from request body (sent from frontend)
    const { userId } = req.body;
    const userIdToUse = userId || req.user._id;

    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: userIdToUse },
    });

    // Emit real-time update (only to the user who marked it as read)
    const io = req.app.get("io");
    if (io) {
      io.to(userIdToUse.toString()).emit("notification:read", req.params.id);
    }

    return res.json({ success: true });
  } catch (err) {
    console.log("❌ Mark As Read Error:", err);
    return res.status(500).json({ error: "Failed to mark as read" });
  }
};

/* ============================================================
   MARK ALL AS READ (User-specific)
============================================================ */
export const markAllRead = async (req, res) => {
  try {
    // Get userId from URL params
    const { userId } = req.params;
    const userIdToUse = userId || req.user._id;

    await Notification.updateMany(
      {
        deletedBy: { $ne: userIdToUse },
        $or: [
          { recipientType: "all" },
          { recipientType: "specific", recipientUserId: userIdToUse },
        ],
      },
      { $addToSet: { readBy: userIdToUse } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.log("❌ Mark All Read Error:", err);
    return res.status(500).json({ error: "Failed to mark all as read" });
  }
};

/* ============================================================
   HIDE/DELETE NOTIFICATION FOR USER ONLY (Soft delete)
============================================================ */
export const deleteNotificationForUser = async (req, res) => {
  try {
    // Get userId from request body (sent from frontend)
    const { userId } = req.body;
    const userIdToUse = userId || req.user._id;

    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { deletedBy: userIdToUse },
    });

    // Emit real-time update (only to the user who deleted it)
    const io = req.app.get("io");
    if (io) {
      io.to(userIdToUse.toString()).emit("notification:delete", req.params.id);
    }

    return res.json({ success: true });
  } catch (err) {
    console.log("❌ Delete Notification Error:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
};