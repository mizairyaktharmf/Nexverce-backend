// Controllers/NewsletterController.js
import Newsletter from "../Models/NewsletterModel.js";

// Subscribe to newsletter (PUBLIC)
export const subscribeNewsletter = async (req, res) => {
  try {
    const { email, source = "website" } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email });

    if (existingSubscriber) {
      if (existingSubscriber.status === "active") {
        return res.status(400).json({
          success: false,
          message: "This email is already subscribed to our newsletter",
        });
      } else {
        // Reactivate unsubscribed email
        existingSubscriber.status = "active";
        existingSubscriber.subscribedAt = Date.now();
        existingSubscriber.unsubscribedAt = null;
        await existingSubscriber.save();

        return res.status(200).json({
          success: true,
          message: "Welcome back! You have been resubscribed to our newsletter",
          data: existingSubscriber,
        });
      }
    }

    // Create new subscriber
    const subscriber = await Newsletter.create({
      email,
      source,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      success: true,
      message: "Successfully subscribed to newsletter!",
      data: subscriber,
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe to newsletter",
      error: error.message,
    });
  }
};

// Get all subscribers (ADMIN ONLY)
export const getAllSubscribers = async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.email = { $regex: search, $options: "i" };
    }

    const subscribers = await Newsletter.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Newsletter.countDocuments(query);
    const activeCount = await Newsletter.getActiveCount();

    res.status(200).json({
      success: true,
      data: subscribers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
      stats: {
        total,
        active: activeCount,
        unsubscribed: total - activeCount,
      },
    });
  } catch (error) {
    console.error("Get subscribers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscribers",
      error: error.message,
    });
  }
};

// Get newsletter statistics (ADMIN ONLY)
export const getNewsletterStats = async (req, res) => {
  try {
    const total = await Newsletter.countDocuments();
    const active = await Newsletter.countDocuments({ status: "active" });
    const unsubscribed = await Newsletter.countDocuments({ status: "unsubscribed" });

    // Get subscribers by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const subscribersByMonth = await Newsletter.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Get subscribers by source
    const subscribersBySource = await Newsletter.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total,
        active,
        unsubscribed,
        subscribersByMonth,
        subscribersBySource,
      },
    });
  } catch (error) {
    console.error("Get newsletter stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch newsletter statistics",
      error: error.message,
    });
  }
};

// Unsubscribe from newsletter (PUBLIC)
export const unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    const subscriber = await Newsletter.findOne({ email });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Email not found in our newsletter list",
      });
    }

    if (subscriber.status === "unsubscribed") {
      return res.status(400).json({
        success: false,
        message: "This email is already unsubscribed",
      });
    }

    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = Date.now();
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: "Successfully unsubscribed from newsletter",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unsubscribe",
      error: error.message,
    });
  }
};

// Delete subscriber (ADMIN ONLY)
export const deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;

    const subscriber = await Newsletter.findByIdAndDelete(id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subscriber deleted successfully",
    });
  } catch (error) {
    console.error("Delete subscriber error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete subscriber",
      error: error.message,
    });
  }
};

// Export subscribers to CSV (ADMIN ONLY)
export const exportSubscribers = async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) query.status = status;

    const subscribers = await Newsletter.find(query)
      .select("email status source subscribedAt createdAt")
      .sort({ createdAt: -1 });

    // Create CSV content
    const csvHeader = "Email,Status,Source,Subscribed At,Created At\n";
    const csvRows = subscribers
      .map(
        (sub) =>
          `${sub.email},${sub.status},${sub.source},${sub.subscribedAt},${sub.createdAt}`
      )
      .join("\n");

    const csv = csvHeader + csvRows;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=newsletter-subscribers.csv");
    res.status(200).send(csv);
  } catch (error) {
    console.error("Export subscribers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export subscribers",
      error: error.message,
    });
  }
};
