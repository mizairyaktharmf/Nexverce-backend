import mongoose from "mongoose";

// Allowed roles in DB
const roles = ["owner", "admin", "staff"];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // Profile Fields
    profileImage: {
      type: String,
      default: "",
    },

    mobile: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    // 🔥 NEW ROLE SYSTEM
    // owner = special
    // admin = privileged
    // staff = all other job titles
    role: {
      type: String,
      enum: roles,
      default: "staff",
    },

    // Email verification
    verified: {
      type: Boolean,
      default: false,
    },

    verificationCode: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
