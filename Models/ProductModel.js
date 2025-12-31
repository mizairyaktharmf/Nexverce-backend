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

    // TELEGRAM LINK (for Telegram-tagged posts)
    telegramLink: { type: String },

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

    // QUIZ MATCHING FIELDS
    quizCategory: {
      type: [String],
      enum: ["marketing", "education", "technology", "lifestyle", "health", "finance"],
      default: [],
    },
    experienceLevel: {
      type: [String],
      enum: ["beginner", "intermediate", "advanced"],
      default: [],
    },
    budgetRange: {
      type: [String],
      enum: ["free", "budget", "mid", "premium"],
      default: [],
    },
    priorities: {
      type: [String],
      enum: ["ease-of-use", "best-quality", "value", "fast-setup", "security", "support", "customization"],
      default: [],
    },
    targetTimeframe: {
      type: [String],
      enum: ["urgent", "soon", "planning"],
      default: [],
    },
    supportLevel: {
      type: [String],
      enum: ["critical", "nice-to-have", "not-important"],
      default: [],
    },
    userType: {
      type: [String],
      enum: ["individual", "small-business", "enterprise"],
      default: [],
    },
    integrationNeeds: {
      type: [String],
      enum: ["essential", "preferred", "not-needed"],
      default: [],
    },

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