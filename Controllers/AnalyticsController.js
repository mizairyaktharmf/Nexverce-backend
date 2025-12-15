import Analytics from "../Models/Analytics.js";
import Product from "../Models/ProductModel.js";
import UserActivity from "../Models/UserActivity.js";
import User from "../Models/User.js";

/* ===================================================================
   📊 ANALYTICS CONTROLLER - Dashboard & Post Analytics
   - getDashboardStats: Real-time dashboard statistics
   - trackView: Record post view
   - trackClick: Record affiliate click
   - getPostAnalytics: Analytics for specific post
   - getTrendingPosts: Most viewed/clicked posts
=================================================================== */

/* ===================================================================
   📈 GET DASHBOARD STATS - Real Analytics for Dashboard
=================================================================== */
export const getDashboardStats = async (req, res) => {
  try {
    console.log("📊 Fetching dashboard analytics...");

    // Get current date boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 👁️ TOTAL VIEWS (all time)
    const totalViews = await Analytics.countDocuments({ type: "view" });

    // 👁️ VIEWS TODAY
    const viewsToday = await Analytics.countDocuments({
      type: "view",
      timestamp: { $gte: todayStart },
    });

    // 🌍 VIEWS BY COUNTRY (top 5)
    const viewsByCountryArray = await Analytics.aggregate([
      { $match: { type: "view" } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Convert array to object
    const viewsByCountry = {};
    viewsByCountryArray.forEach((item) => {
      viewsByCountry[item._id] = item.count;
    });

    // 💻 VIEWS BY DEVICE TYPE
    const viewsByDeviceArray = await Analytics.aggregate([
      { $match: { type: "view" } },
      { $group: { _id: "$deviceType", count: { $sum: 1 } } },
    ]);

    // Convert to object and calculate percentages
    const totalDeviceViews = viewsByDeviceArray.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const viewsByDevice = {};
    viewsByDeviceArray.forEach((item) => {
      const percentage = ((item.count / totalDeviceViews) * 100).toFixed(0);
      viewsByDevice[item._id] = parseInt(percentage);
    });

    // 🔥 MOST VIEWED POST
    const mostViewedPostData = await Analytics.aggregate([
      { $match: { type: "view" } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    let mostViewedPost = "No data yet";
    if (mostViewedPostData.length > 0) {
      const post = await Product.findById(mostViewedPostData[0]._id).select(
        "title"
      );
      if (post) mostViewedPost = post.title;
    }

    // 🖱️ MOST CLICKS POST
    const mostClicksPostData = await Analytics.aggregate([
      { $match: { type: "click" } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    let mostClicksPost = "No data yet";
    if (mostClicksPostData.length > 0) {
      const post = await Product.findById(mostClicksPostData[0]._id).select(
        "title"
      );
      if (post) mostClicksPost = post.title;
    }

    // 🔥 TOP TRENDING POSTS (most viewed in last 7 days)
    const topTrendingData = await Analytics.aggregate([
      {
        $match: {
          type: "view",
          timestamp: { $gte: weekStart },
        },
      },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topTrending = [];
    for (const item of topTrendingData) {
      const post = await Product.findById(item._id).select("title");
      if (post) topTrending.push(post.title);
    }

    // 👥 STAFF INSIGHTS (from UserActivity) - Count UNIQUE users only
    const staffUsers = await User.find({ role: "staff" }).select("_id");
    const staffUserIds = staffUsers.map((user) => user._id);

    // Get unique staff who logged in today
    const todayActivities = await UserActivity.find({
      userId: { $in: staffUserIds },
      loginTime: { $gte: todayStart },
    }).distinct("userId");
    const newStaffToday = todayActivities.length;

    // Get unique staff who logged in early (8:30-9 AM)
    const earlyLoginActivities = await UserActivity.find({
      userId: { $in: staffUserIds },
      isEarlyLogin: true,
      loginTime: { $gte: todayStart },
    }).distinct("userId");
    const earlyLoginStaff = earlyLoginActivities.length;

    // 📅 SCHEDULED POSTS (from Product model)
    const scheduledToday = await Product.countDocuments({
      status: "scheduled",
      publishDate: {
        $gte: todayStart,
        $lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const scheduledWeek = await Product.countDocuments({
      status: "scheduled",
      publishDate: {
        $gte: todayStart,
        $lt: new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    console.log("✅ Dashboard stats fetched successfully");

    res.status(200).json({
      success: true,
      stats: {
        totalViews,
        viewsToday,
        viewsByCountry,
        viewsByDevice,
        mostViewedPost,
        mostClicksPost,
        topTrending,
        newStaffToday,
        earlyLoginStaff,
        scheduledToday,
        scheduledWeek,
      },
    });
  } catch (err) {
    console.error("❌ Dashboard stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: err.message,
    });
  }
};

/* ===================================================================
   👁️ TRACK POST VIEW
=================================================================== */
export const trackView = async (req, res) => {
  try {
    const {
      postId,
      country,
      countryCode,
      city,
      region,
      ip,
      timezone,
      deviceType,
      browser,
      os,
      referrer,
      sessionId,
    } = req.body;

    // Validate postId
    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    // Check if post exists
    const post = await Product.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Create analytics record
    const analyticsData = {
      postId,
      type: "view",
      country: country || "Unknown",
      countryCode: countryCode || "XX",
      city: city || "Unknown",
      region: region || "Unknown",
      ip: ip || "Unknown",
      timezone: timezone || "Unknown",
      deviceType: deviceType || "unknown",
      browser: browser || "Unknown",
      os: os || "Unknown",
      referrer: referrer || "Direct",
      sessionId: sessionId || null,
    };

    await Analytics.create(analyticsData);

    console.log(`👁️ View tracked for post: ${post.title}`);

    res.status(200).json({
      success: true,
      message: "View tracked successfully",
    });
  } catch (err) {
    console.error("❌ Track view error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to track view",
      error: err.message,
    });
  }
};

/* ===================================================================
   🖱️ TRACK AFFILIATE CLICK
=================================================================== */
export const trackClick = async (req, res) => {
  try {
    const {
      postId,
      country,
      countryCode,
      city,
      region,
      ip,
      timezone,
      deviceType,
      browser,
      os,
      referrer,
      sessionId,
    } = req.body;

    // Validate postId
    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    // Check if post exists
    const post = await Product.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Create analytics record
    const analyticsData = {
      postId,
      type: "click",
      country: country || "Unknown",
      countryCode: countryCode || "XX",
      city: city || "Unknown",
      region: region || "Unknown",
      ip: ip || "Unknown",
      timezone: timezone || "Unknown",
      deviceType: deviceType || "unknown",
      browser: browser || "Unknown",
      os: os || "Unknown",
      referrer: referrer || "Direct",
      sessionId: sessionId || null,
    };

    await Analytics.create(analyticsData);

    console.log(`🖱️ Click tracked for post: ${post.title}`);

    res.status(200).json({
      success: true,
      message: "Click tracked successfully",
    });
  } catch (err) {
    console.error("❌ Track click error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to track click",
      error: err.message,
    });
  }
};

/* ===================================================================
   📊 GET POST ANALYTICS - Analytics for specific post
=================================================================== */
export const getPostAnalytics = async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if post exists
    const post = await Product.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Total views
    const totalViews = await Analytics.countDocuments({
      postId,
      type: "view",
    });

    // Total clicks
    const totalClicks = await Analytics.countDocuments({
      postId,
      type: "click",
    });

    // Views by country
    const viewsByCountry = await Analytics.aggregate([
      { $match: { postId: post._id, type: "view" } },
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Views by device
    const viewsByDevice = await Analytics.aggregate([
      { $match: { postId: post._id, type: "view" } },
      { $group: { _id: "$deviceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log(`📊 Analytics fetched for post: ${post.title}`);

    res.status(200).json({
      success: true,
      analytics: {
        postTitle: post.title,
        totalViews,
        totalClicks,
        clickThroughRate:
          totalViews > 0
            ? ((totalClicks / totalViews) * 100).toFixed(2)
            : "0.00",
        viewsByCountry,
        viewsByDevice,
      },
    });
  } catch (err) {
    console.error("❌ Get post analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch post analytics",
      error: err.message,
    });
  }
};

/* ===================================================================
   🔥 GET TRENDING POSTS
=================================================================== */
export const getTrendingPosts = async (req, res) => {
  try {
    const { days = 7, limit = 10 } = req.query;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trendingData = await Analytics.aggregate([
      {
        $match: {
          type: "view",
          timestamp: { $gte: startDate },
        },
      },
      { $group: { _id: "$postId", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: parseInt(limit) },
    ]);

    // Get post details
    const trending = [];
    for (const item of trendingData) {
      const post = await Product.findById(item._id).select("title slug image");
      if (post) {
        trending.push({
          ...post.toObject(),
          views: item.views,
        });
      }
    }

    console.log(`🔥 Fetched ${trending.length} trending posts`);

    res.status(200).json({
      success: true,
      trending,
    });
  } catch (err) {
    console.error("❌ Get trending posts error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending posts",
      error: err.message,
    });
  }
};
