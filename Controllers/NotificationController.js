import Notification from "../Models/Notification.js";

export const createNotification = async (message, type, user="admin") => {
  await Notification.create({ message, type, user });
};

export const getNotifications = async (req, res) => {
  const notes = await Notification.find().sort({ createdAt: -1 });
  res.json(notes);
};

export const markAsRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ success: true });
};

export const markAllRead = async (req, res) => {
  await Notification.updateMany({}, { read: true });
  res.json({ success: true });
};
