import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    type: { type: String, enum: ["published", "draft", "scheduled", "update", "delete"], default: "published" },
    read: { type: Boolean, default: false },
    user: { type: String }, // optional
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
