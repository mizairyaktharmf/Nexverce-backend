import mongoose from "mongoose";

const roles = ["admin", "editor", "content_creator"]; // extend later

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: roles, default: "admin" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
