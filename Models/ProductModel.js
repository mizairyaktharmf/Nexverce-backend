import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // BASIC INFO
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },

    description: { type: String },
    category: { type: String, required: true },
    tag: { type: String },

    // PRODUCT / DEAL DATA
    price: { type: String },
    currency: { type: String, default: "USD" },
    referralLink: { type: String },
    image: { type: String },

    // 🟣 TYPE = "product" (this helps determine edit type)
    type: { type: String, default: "product" },

    // CONTENT (OLD HTML SUPPORT)
    content: { type: String },

    // ⭐ NEW BLOCK EDITOR JSON
    blocks: {
      type: Array,
      default: [],
    },

    // STATUS
    status: {
      type: String,
      enum: ["draft", "published", "scheduled"],
      default: "draft",
    },

    // SCHEDULED POSTS
    scheduledAt: { type: Date },

    // ANALYTICS
    views: { type: Number, default: 0 },
    viewedCountries: {
      type: Array,
      default: [],
    },

    // ADMIN INFO
    createdBy: { type: String }, // userid or name
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;