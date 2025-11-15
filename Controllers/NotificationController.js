// Controllers/NotificationController.js
import Notification from "../Models/Notification.js";

/* --------------------------------------
   INTERNAL: Create notification (used by posts)
-------------------------------------- */
export const addNotification = async (message, type = "info", user = "admin") => {
  try {
    await Notification.create({ message, type, user });
  } catch (err) {
    console.log("❌ Notification create failed:", err);
  }
};

/* --------------------------------------
   PUBLIC API: Create notification from frontend
-------------------------------------- */
export const createNotificationAPI = async (req, res) => {
  try {
    const { message, type, user } = req.body;

    const note = await Notification.create({
      message,
      type: type || "info",
      user: user || "admin",
    });

    res.json(note);
  } catch (err) {
    res.status(500).json({ error: "Failed to create notification" });
  }
};

/* --------------------------------------
   GET ALL NOTIFICATIONS
-------------------------------------- */
export const getNotifications = async (req, res) => {
  try {
    const notes = await Notification.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/* --------------------------------------
   MARK SINGLE AS READ
-------------------------------------- */
export const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
};

/* --------------------------------------
   MARK ALL AS READ
-------------------------------------- */
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({}, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all read" });
  }
};