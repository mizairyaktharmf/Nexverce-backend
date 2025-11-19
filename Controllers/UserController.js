import User from "../Models/User.js";

/* ===========================================
   GET ALL USERS
=========================================== */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -verificationCode");
    res.json({ users });
  } catch (err) {
    console.log("❌ Error fetching all users:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================================
   GET STAFF ONLY
=========================================== */
export const getStaffUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["staff", "editor", "content_creator"] },
    }).select("-password -verificationCode");

    res.json({ users });
  } catch (err) {
    console.log("❌ Error fetching staff:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ===========================================
   DELETE USER
=========================================== */
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.log("❌ Delete failed:", err);
    res.status(500).json({ message: "Server error" });
  }
};
