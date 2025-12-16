import User from "../Models/User.js";
import bcrypt from "bcryptjs";
import UserActivity from "../Models/UserActivity.js"; // ⭐ ACTIVITY MODEL
import { createNotification } from "./NotificationController.js";

/* ============================================================
   GET ALL USERS (ADMIN ONLY)
============================================================ */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -verificationCode");

    return res.json({ users });   // Return wrapped for consistency
  } catch (err) {
    console.log("❌ Error fetching all users:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   GET ALL STAFF AND ADMIN USERS WITH LOGIN/LOGOUT TIMES
============================================================ */
export const getStaffUsers = async (req, res) => {
  try {
    // Get ALL users (both staff and admin roles)
    const users = await User.find({ role: { $in: ["staff", "admin"] } })
      .select("-password -verificationCode")
      .sort({ createdAt: -1 });

    // For each user, get their latest activity (login/logout times)
    const usersWithActivity = await Promise.all(
      users.map(async (user) => {
        // Get the latest activity record for this user
        const latestActivity = await UserActivity.findOne({ userId: user._id })
          .sort({ loginTime: -1 })
          .select("loginTime logoutTime online")
          .lean();

        return {
          ...user.toObject(),
          lastLoginAt: latestActivity?.loginTime || null,
          lastLogoutAt: latestActivity?.logoutTime || null,
          isOnline: latestActivity?.online || false,
        };
      })
    );

    return res.json({ users: usersWithActivity });  // Return with activity data
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

    return res.json(user);   // ✅ FIXED – no wrapper
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

    return res.json(activity);   // ✅ FIXED
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
      .sort({ loginTime: -1 })
      .select(
        "loginTime logoutTime timezone city country countryCode region ip browser deviceType os online lastSeen"
      )
      .limit(100);

    return res.json(logs);    // ✅ FIXED — return array only
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

    // Create personal notification only visible to this user
    await createNotification({
      message: `updated your profile`,
      type: "profile",
      performedBy: req.user,
      target: {
        id: updatedUser._id,
        title: `${updatedUser.firstName} ${updatedUser.lastName}`,
        model: "User",
      },
      recipientType: "specific",
      recipientUserId: req.user.id,
      io: req.app.get("io"),
    });

    return res.json(updatedUser);  // ✅ FIXED
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

    return res.json(updated);   // ✅ FIXED
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

/* ============================================================
   UPDATE USER PRESENCE (HEARTBEAT)
============================================================ */
export const updatePresence = async (req, res) => {
  try {
    const userId = req.user.id;

    // Update lastSeen in User model for online status
    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date()
    });

    // Also update UserActivity
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

/* ============================================================
   ⭐ GET LOGIN STATISTICS (EARLY/LATE LOGINS) - STAFF ONLY
   ⚠️ Only counts staff logins, not admin logins
============================================================ */
export const getLoginStatistics = async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all staff user IDs
    const staffUsers = await User.find({ role: "staff" }).select("_id");
    const staffUserIds = staffUsers.map((user) => user._id);

    // Get all today's login activities for staff
    const allTodayActivities = await UserActivity.find({
      userId: { $in: staffUserIds },
      loginTime: { $gte: today, $lt: tomorrow },
    })
      .populate("userId", "firstName lastName email profileImage")
      .sort({ loginTime: 1 })
      .select("loginTime logoutTime online isEarlyLogin isLateLogin");

    // Helper to remove duplicate users (keep most recent login)
    const getUniqueStaff = (activities) => {
      const uniqueMap = new Map();
      activities.forEach((activity) => {
        const userId = activity.userId?._id?.toString();
        if (userId && !uniqueMap.has(userId)) {
          uniqueMap.set(userId, activity);
        }
      });
      return Array.from(uniqueMap.values());
    };

    // Get early login staff (unique users)
    const earlyActivities = allTodayActivities.filter((a) => a.isEarlyLogin);
    const uniqueEarlyStaff = getUniqueStaff(earlyActivities);
    console.log("📊 Early login activities:", earlyActivities.length, "Unique:", uniqueEarlyStaff.length);

    // Get late login staff (unique users)
    const lateActivities = allTodayActivities.filter((a) => a.isLateLogin);
    const uniqueLateStaff = getUniqueStaff(lateActivities);
    console.log("📊 Late login activities:", lateActivities.length, "Unique:", uniqueLateStaff.length);

    // Get staff who logged out after 6 PM
    const sixPMToday = new Date(today);
    sixPMToday.setHours(18, 0, 0, 0);

    const loggedOutAfter6PM = allTodayActivities.filter((activity) => {
      return (
        activity.logoutTime &&
        new Date(activity.logoutTime) >= sixPMToday &&
        new Date(activity.logoutTime) < tomorrow
      );
    });
    const uniqueLoggedOutStaff = getUniqueStaff(loggedOutAfter6PM);

    // Get unique total staff who logged in today
    const uniqueTotalStaff = getUniqueStaff(allTodayActivities);

    // Format the staff data
    const formatStaffData = (activities) => {
      return activities.map((activity) => ({
        _id: activity.userId?._id,
        name: `${activity.userId?.firstName || ""} ${activity.userId?.lastName || ""}`.trim() || "Unknown",
        email: activity.userId?.email || "No email",
        profileImage: activity.userId?.profileImage,
        loginTime: activity.loginTime,
        logoutTime: activity.logoutTime,
        online: activity.online,
      }));
    };

    const responseData = {
      success: true,
      totalLoginCount: uniqueTotalStaff.length,
      earlyLoginCount: uniqueEarlyStaff.length,
      lateLoginCount: uniqueLateStaff.length,
      loggedOutAfter6PMCount: uniqueLoggedOutStaff.length,
      totalLoginStaff: formatStaffData(uniqueTotalStaff),
      earlyLoginStaff: formatStaffData(uniqueEarlyStaff),
      lateLoginStaff: formatStaffData(uniqueLateStaff),
      loggedOutAfter6PMStaff: formatStaffData(uniqueLoggedOutStaff),
    };

    console.log("✅ Sending response - Early staff:", responseData.earlyLoginStaff.length, "Late staff:", responseData.lateLoginStaff.length);

    return res.json(responseData);
  } catch (err) {
    console.log("❌ Login statistics error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
