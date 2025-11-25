import User from "../Models/User.js";
import bcrypt from "bcryptjs";
import UserActivity from "../Models/UserActivity.js"; // ⭐ ACTIVITY MODEL

/* ============================================================
   GET ALL USERS (ADMIN ONLY)
============================================================ */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -verificationCode");
    return res.json({ users });
  } catch (err) {
    console.log("❌ Error fetching all users:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   GET ONLY STAFF USERS
============================================================ */
export const getStaffUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "staff" })
      .select("-password -verificationCode");

    return res.json({ users });
  } catch (err) {
    console.log("❌ Error fetching staff:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   GET SINGLE USER (ADMIN OR SELF)
============================================================ */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password -verificationCode");

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.log("❌ Error fetching user:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ⭐ GET ALL STAFF LOGIN/LOGOUT ACTIVITY
============================================================ */
export const getStaffActivity = async (req, res) => {
  try {
    const activity = await UserActivity.find()
      .populate("userId", "firstName lastName email role profileImage")
      .sort({ loginTime: -1 });

    return res.json({ activity });
  } catch (err) {
    console.log("❌ Activity fetch error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   ⭐ GET SPECIFIC USER LOGIN/LOGOUT HISTORY
============================================================ */
export const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await UserActivity.find({ userId: id })
      .sort({ loginTime: -1 });

    return res.json({ success: true, logs });
  } catch (err) {
    console.log("❌ Activity fetch error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   UPDATE PROFILE (SELF)
============================================================ */
export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password -verificationCode");

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.log("❌ Profile update error:", err);
    return res.status(500).json({ message: "Server failed" });
  }
};

/* ============================================================
   UPDATE USER ROLE (ADMIN ONLY)
============================================================ */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select("-password -verificationCode");

    return res.json({ message: "Role updated", user: updated });
  } catch (err) {
    console.log("❌ Role update error:", err);
    return res.status(500).json({ message: "Server failed" });
  }
};

/* ============================================================
   CHANGE PASSWORD (SELF)
============================================================ */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match)
      return res.status(400).json({ message: "Old password incorrect" });

    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.log("❌ Change password error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   DELETE USER (ADMIN)
============================================================ */
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    return res.json({ success: true });
  } catch (err) {
    console.log("❌ Delete failed:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   UPDATE USER PRESENCE (HEARTBEAT)
========================================================= */
export const updatePresence = async (req, res) => {
  try {
    const userId = req.user.id;

    await UserActivity.findOneAndUpdate(
      { userId, online: true },
      { lastSeen: new Date() }
    );

    return res.json({ success: true });
  } catch (err) {
    console.log("Presence update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
