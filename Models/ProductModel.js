import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    price: { type: String },

    currency: { type: String, default: "USD" },

    tag: { type: String },
    category: { type: String },
    image: { type: String },
    type: { type: String },
    slug: { type: String },

    // OLD CONTENT (HTML)
    content: { type: String },

    // ⭐ NEW FIELD FOR BLOCK SYSTEM
    contentBlocks: {
      type: Array,
      default: [],
    },

    referralLink: { type: String },

    status: { type: String, default: "draft" },
    endTime: { type: String },
    scheduledAt: { type: Date },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;