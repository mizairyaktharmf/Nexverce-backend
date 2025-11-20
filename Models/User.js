import mongoose from "mongoose";

// Allowed roles in system
const roles = ["admin", "staff"];

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

    // Profile
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

    // 🔥 ONLY TWO ROLES → admin OR staff
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