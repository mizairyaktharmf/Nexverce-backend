import mongoose from "mongoose";

// All allowed roles
const roles = ["admin", "editor", "content_creator"];

const userSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: true, 
      trim: true 
    },

    lastName: { 
      type: String, 
      required: true, 
      trim: true 
    },

    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },

    password: { 
      type: String, 
      required: true 
    },

    // 🔥 NEW FIELDS FOR PROFILE MODULE
    profileImage: { 
      type: String, 
      default: ""   // Cloudinary URL
    },

    mobile: { 
      type: String, 
      default: "" 
    },

    bio: { 
      type: String, 
      default: "" 
    },

    // 🔥 ROLE SYSTEM
    role: { 
      type: String, 
      enum: roles, 
      default: "admin"   // your original default
    },

    // Account verification
    verified: { 
      type: Boolean, 
      default: false 
    },

    verificationCode: { 
      type: String 
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
