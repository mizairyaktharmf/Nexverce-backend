import bcrypt from "bcryptjs";
import User from "../Models/User.js";

// Password rules: 8 chars, 1 uppercase, 1 number, 1 special char
const PASS_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

/* =========================================================
   📌 UPDATE PROFILE
   Fields allowed:
   - firstName
   - lastName
   - mobile
   - bio
   - profileImage (Cloudinary URL)
========================================================= */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const { firstName, lastName, mobile, bio, profileImage } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update fields only if present in request
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (mobile !== undefined) user.mobile = mobile;
    if (bio !== undefined) user.bio = bio;
    if (profileImage !== undefined) user.profileImage = profileImage;

    const updatedUser = await user.save();

    // Remove password from the response
    const userObj = updatedUser.toObject();
    delete userObj.password;

    return res.json({
      message: "Profile updated successfully",
      user: userObj,
    });
  } catch (err) {
    console.error("❌ updateProfile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================================================
   📌 CHANGE PASSWORD
   Required fields:
   - oldPassword
   - newPassword
   - confirmNewPassword
========================================================= */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;

    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    if (!PASS_REGEX.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be 8+ chars with 1 uppercase, 1 number, and 1 special character",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check old password
    const isValidOldPass = await bcrypt.compare(oldPassword, user.password);
    if (!isValidOldPass) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    await user.save();

    return res.json({ message: "Password changed successfully" });

  } catch (err) {
    console.error("❌ changePassword error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
