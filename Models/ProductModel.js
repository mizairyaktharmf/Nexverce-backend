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

    // TYPE = product
    type: { type: String, default: "product" },

    // OLD HTML SUPPORT
    content: { type: String },

    // ⭐ BLOCK EDITOR JSON
    contentBlocks: {
      type: Array,
      default: [],
    },

    // STATUS
    status: {
      type: String,
      enum: ["draft", "published", "scheduled"],
      default: "draft",
    },

    // SCHEDULE TIME
    scheduledAt: { type: Date },

    // ANALYTICS
    views: { type: Number, default: 0 },
    viewedCountries: { type: Array, default: [] },

    // USER WHO CREATED THE POST
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // USER WHO LAST UPDATED THE POST
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;