// Controllers/NotificationController.js
import Notification from "../Models/Notification.js";

/* ------------------------------
   CREATE NOTIFICATION (Reusable)
------------------------------ */
export const createNotification = async (message, type = "info", user = "admin") => {
  try {
    await Notification.create({ message, type, user });
  } catch (err) {
    console.error("❌ Failed to create notification:", err.message);
  }
};

/* ------------------------------
   GET ALL NOTIFICATIONS
------------------------------ */
export const getNotifications = async (req, res) => {
  try {
    const notes = await Notification.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/* ------------------------------
   MARK ONE NOTIFICATION AS READ
------------------------------ */
export const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

/* ------------------------------
   MARK ALL NOTIFICATIONS AS READ
------------------------------ */
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({}, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark all as read" });
  }
};