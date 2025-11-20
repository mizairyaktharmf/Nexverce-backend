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
}) => {
  try {
    await Notification.create({
      message,
      type,
      performedBy: {
        userId: performedBy.id,
        name: performedBy.firstName + " " + performedBy.lastName,
        role: performedBy.role,
      },
      target,
      recipientType,
      recipientUserId,
    });
  } catch (err) {
    console.error("❌ Notification create failed:", err.message);
  }
};

/* ============================================================
   GET NOTIFICATIONS FOR CURRENT USER
============================================================ */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notes = await Notification.find({
      deletedBy: { $ne: userId }, // hide deleted notifications
      $or: [
        { recipientType: "all" },
        { recipientType: "specific", recipientUserId: userId },
      ],
    })
      .sort({ createdAt: -1 });

    return res.json(notes);
  } catch (err) {
    console.log("❌ Get Notifications Error:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/* ============================================================
   MARK ONE NOTIFICATION AS READ (Self Only)
============================================================ */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: userId },
    });

    return res.json({ success: true });
  } catch (err) {
    console.log("❌ Mark As Read Error:", err);
    return res.status(500).json({ error: "Failed to mark as read" });
  }
};

/* ============================================================
   MARK ALL NOTIFICATIONS AS READ (Self Only)
============================================================ */
export const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      {
        deletedBy: { $ne: userId },
        $or: [
          { recipientType: "all" },
          { recipientType: "specific", recipientUserId: userId },
        ],
      },
      { $addToSet: { readBy: userId } }
    );

    return res.json({ success: true });
  } catch (err) {
    console.log("❌ Mark All Read Error:", err);
    return res.status(500).json({ error: "Failed to mark all as read" });
  }
};

/* ============================================================
   DELETE NOTIFICATION FOR CURRENT USER (Self Only)
============================================================ */
export const deleteNotificationForUser = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { deletedBy: userId },
    });

    return res.json({ success: true });
  } catch (err) {
    console.log("❌ Delete Notification Error:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
};