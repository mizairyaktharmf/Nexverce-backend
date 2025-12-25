import SocialPost from "../Models/SocialPost.js";
import SocialAccount from "../Models/SocialAccount.js";
import LinkedInSettings from "../Models/LinkedInSettings.js";
import Product from "../Models/ProductModel.js";
import Blog from "../Models/BlogModel.js";
import LandingPage from "../Models/LandingPageModel.js";
import { generateLinkedInCaption } from "../Utils/LinkedInCaptionGenerator.js";
import { refreshTokenIfNeeded } from "./LinkedInController.js";
import { createNotification } from "./NotificationController.js";
import axios from "axios";

// LinkedIn API URLs (REST API 2023+)
const LINKEDIN_POST_API = "https://api.linkedin.com/rest/posts";
const LINKEDIN_ANALYTICS_API = "https://api.linkedin.com/v2/organizationalEntityShareStatistics";

/**
 * Create and Post to LinkedIn (Immediately or Schedule)
 * POST /api/linkedin/posts
 */
export const createLinkedInPost = async (req, res) => {
  try {
    const { postId, postType, mode, scheduledAt, accountId, customCaption } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!postId || !postType || !mode) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: postId, postType, mode",
      });
    }

    if (!["product", "blog", "landingpage"].includes(postType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid postType. Must be: product, blog, or landingpage",
      });
    }

    if (!["now", "schedule"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Must be: now or schedule",
      });
    }

    if (mode === "schedule" && !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: "scheduledAt is required when mode is 'schedule'",
      });
    }

    // Get Nexverce post
    let post;
    if (postType === "product") {
      post = await Product.findById(postId);
    } else if (postType === "blog") {
      post = await Blog.findById(postId);
    } else if (postType === "landingpage") {
      post = await LandingPage.findById(postId);
    }

    if (!post) {
      return res.status(404).json({
        success: false,
        message: `${postType} not found`,
      });
    }

    // Get LinkedIn account
    let socialAccount;
    if (accountId) {
      socialAccount = await SocialAccount.findOne({
        _id: accountId,
        userId: userId,
        platform: "linkedin",
        isActive: true,
      });
    } else {
      // Get default account from settings or first active account
      const settings = await LinkedInSettings.findOne({ userId: userId });
      if (settings?.defaultAccountId) {
        socialAccount = await SocialAccount.findOne({
          _id: settings.defaultAccountId,
          isActive: true,
        });
      }

      // Fallback to first active account
      if (!socialAccount) {
        socialAccount = await SocialAccount.findOne({
          userId: userId,
          platform: "linkedin",
          isActive: true,
        }).sort({ createdAt: 1 });
      }
    }

    if (!socialAccount) {
      return res.status(404).json({
        success: false,
        message: "No LinkedIn account connected. Please connect your LinkedIn account first.",
      });
    }

    // Refresh token if needed
    await refreshTokenIfNeeded(socialAccount);

    // Get user settings
    const settings = await LinkedInSettings.findOne({ userId: userId });

    // Generate caption (or use custom caption)
    let captionData;
    if (customCaption && customCaption.trim()) {
      // Use custom caption provided by user
      captionData = {
        caption: customCaption.trim(),
        hashtags: [],
        rawCaption: customCaption.trim(),
        metadata: { generatedByAI: false, custom: true },
      };
    } else {
      // Only generate AI caption if no custom caption provided
      captionData = await generateLinkedInCaption(post, postType, settings);
    }

    // Build target URL with UTM tracking
    // Point to nexverce-client where full content is displayed
    const clientBaseUrl = process.env.CLIENT_URL || "https://nexverce-client.onrender.com";

    // Build correct URL based on post type
    let baseUrl;
    if (postType === "blog" || postType === "product") {
      // For blogs and products, use /post/:id format
      baseUrl = `${clientBaseUrl}/post/${postId}`;
    } else if (postType === "landingpage") {
      // For landing pages, use /lp/:slug format
      baseUrl = `${clientBaseUrl}/lp/${post.slug}`;
    } else {
      // Fallback
      baseUrl = `${clientBaseUrl}/post/${postId}`;
    }

    const targetUrl = settings
      ? settings.buildTrackingUrl(baseUrl)
      : `${baseUrl}?utm_source=linkedin&utm_medium=social&utm_campaign=autopost`;

    // Create social post record
    const socialPost = await SocialPost.create({
      nexvercePostId: postId,
      nexvercePostType: postType,
      platform: "linkedin",
      socialAccountId: socialAccount._id,
      caption: captionData.caption,
      rawCaption: captionData.rawCaption,
      imageUrl: post.image,
      targetUrl: targetUrl,
      hashtags: captionData.hashtags,
      scheduledAt: mode === "schedule" ? new Date(scheduledAt) : null,
      status: mode === "schedule" ? "scheduled" : "posting",
      createdBy: userId,
      metadata: {
        captionGeneratedByAI: captionData.metadata?.generatedByAI || false,
        postMode: "auto",
      },
    });

    // If mode is "now", post immediately
    if (mode === "now") {
      await postToLinkedInNow(socialPost, socialAccount, req.app.get("io"), post);
    }

    // Create notification
    await createNotification({
      message: mode === "now" ? `posted "${post.title}" to LinkedIn` : `scheduled "${post.title}" for LinkedIn`,
      type: "social",
      performedBy: req.user,
      target: {
        id: socialPost._id,
        title: post.title,
        model: "SocialPost",
      },
      recipientType: "admins",
      io: req.app.get("io"),
    });

    console.log(`✅ LinkedIn post ${mode === "now" ? "posted" : "scheduled"}: ${post.title}`);

    return res.json({
      success: true,
      message: mode === "now" ? "Posted to LinkedIn successfully" : "Scheduled for LinkedIn posting",
      socialPost: await socialPost.populate("socialAccountId", "accountName accountEmail profileImageUrl"),
    });
  } catch (error) {
    console.error("❌ LinkedIn post creation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create LinkedIn post",
      error: error.message,
    });
  }
};

/**
 * Post to LinkedIn API (Core Function)
 */
async function postToLinkedInNow(socialPost, socialAccount, io, originalPost = null) {
  try {
    console.log(`📤 Posting to LinkedIn: ${socialPost.caption.substring(0, 50)}...`);
    console.log(`🔑 LinkedIn User ID: ${socialAccount.linkedinUserId}`);

    // Build LinkedIn REST API Post payload (2023+ format)
    // Support both personal and organization posting
    const authorUrn = socialAccount.accountType === "company" && socialAccount.linkedinOrgId
      ? `urn:li:organization:${socialAccount.linkedinOrgId}`
      : `urn:li:person:${socialAccount.linkedinUserId}`;

    // Build caption with link at the end (only if not already in caption)
    let fullCommentary = socialPost.caption;
    if (socialPost.targetUrl && !socialPost.caption.includes(socialPost.targetUrl)) {
      // Only add link if user hasn't already included it in their caption
      fullCommentary += `\n\n🔗 Read more: ${socialPost.targetUrl}`;
    }

    const payload = {
      author: authorUrn,
      commentary: fullCommentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    // If there's an image, upload it to LinkedIn and attach as media (full image post)
    if (socialPost.imageUrl) {
      try {
        console.log(`📸 Uploading image to LinkedIn: ${socialPost.imageUrl}`);

        // Step 1: Initialize image upload
        const initUploadResponse = await axios.post(
          "https://api.linkedin.com/rest/images?action=initializeUpload",
          {
            initializeUploadRequest: {
              owner: authorUrn,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${socialAccount.accessToken}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
              "LinkedIn-Version": "202501",
            },
          }
        );

        const { uploadUrl, image: imageUrn } = initUploadResponse.data.value;
        console.log(`✅ Image URN obtained: ${imageUrn}`);

        // Step 2: Download image from Nexverce
        const imageResponse = await axios.get(socialPost.imageUrl, {
          responseType: "arraybuffer",
        });

        // Step 3: Upload image to LinkedIn's upload URL
        await axios.put(uploadUrl, imageResponse.data, {
          headers: {
            "Content-Type": imageResponse.headers["content-type"] || "image/jpeg",
          },
        });

        console.log(`✅ Image uploaded successfully`);

        // Step 4: Attach image to post payload
        payload.content = {
          media: {
            altText: originalPost?.title || socialPost.rawCaption || "Nexverce post image",
            id: imageUrn,
          },
        };
      } catch (imageError) {
        console.error("❌ Image upload failed:", imageError.response?.data || imageError.message);
        // Fallback to article format if image upload fails
        if (socialPost.targetUrl) {
          payload.content = {
            article: {
              source: socialPost.targetUrl,
              title: originalPost?.title || "Check out this post on Nexverce",
              description: socialPost.rawCaption || socialPost.caption.substring(0, 200),
            },
          };
        }
      }
    }

    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

    // Post to LinkedIn
    const response = await axios.post(LINKEDIN_POST_API, payload, {
      headers: {
        Authorization: `Bearer ${socialAccount.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202501",
      },
    });

    // Extract post ID from response header (x-restli-id) or body
    const linkedinPostId = response.headers["x-restli-id"] || response.data.id;

    // IMPORTANT: Use Nexverce.com URL instead of LinkedIn URL
    // This way when users click the link, they go to nexverce.com/blog/post-title
    // instead of the LinkedIn post page
    const nexvercePostUrl = socialPost.targetUrl;

    // Mark as posted with Nexverce URL
    await socialPost.markAsPosted({
      postId: linkedinPostId,
      postUrl: nexvercePostUrl, // Using Nexverce URL instead of LinkedIn URL
    });

    console.log(`✅ Successfully posted to LinkedIn: ${linkedinPostId}`);

    // Emit socket event for real-time update
    if (io) {
      io.emit("linkedin:post-success", {
        socialPostId: socialPost._id,
        linkedinPostId: linkedinPostId,
      });
    }

    return true;
  } catch (error) {
    console.error("❌ LinkedIn posting failed:", error.response?.data || error.message);

    // Mark as failed
    const errorMsg = error.response?.data?.message || error.message;
    await socialPost.markAsFailed(errorMsg);

    // Emit socket event for failure
    if (io) {
      io.emit("linkedin:post-failed", {
        socialPostId: socialPost._id,
        error: errorMsg,
      });
    }

    return false;
  }
}

/**
 * Get All LinkedIn Posts (with filters)
 * GET /api/linkedin/posts
 */
export const getLinkedInPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, postType, limit = 50, page = 1 } = req.query;

    const query = {
      createdBy: userId,
      platform: "linkedin",
    };

    if (status) {
      query.status = status;
    }

    if (postType) {
      query.nexvercePostType = postType;
    }

    const skip = (page - 1) * limit;

    const posts = await SocialPost.find(query)
      .populate("socialAccountId", "accountName accountEmail profileImageUrl")
      .populate("nexvercePostId")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await SocialPost.countDocuments(query);

    return res.json({
      success: true,
      posts: posts,
      pagination: {
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching LinkedIn posts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LinkedIn posts",
    });
  }
};

/**
 * Get Single LinkedIn Post with Analytics
 * GET /api/linkedin/posts/:id
 */
export const getLinkedInPostById = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await SocialPost.findOne({
      _id: postId,
      createdBy: userId,
    })
      .populate("socialAccountId", "accountName accountEmail profileImageUrl")
      .populate("nexvercePostId");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "LinkedIn post not found",
      });
    }

    return res.json({
      success: true,
      post: post,
    });
  } catch (error) {
    console.error("❌ Error fetching LinkedIn post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LinkedIn post",
    });
  }
};

/**
 * Delete LinkedIn Post (Only draft/scheduled)
 * DELETE /api/linkedin/posts/:id
 */
export const deleteLinkedInPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await SocialPost.findOne({
      _id: postId,
      createdBy: userId,
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "LinkedIn post not found",
      });
    }

    // Only allow deletion of draft or scheduled posts
    if (post.status === "posted") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a post that has already been published to LinkedIn",
      });
    }

    await post.deleteOne();

    console.log(`🗑️ LinkedIn post deleted: ${post._id}`);

    return res.json({
      success: true,
      message: "LinkedIn post deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting LinkedIn post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete LinkedIn post",
    });
  }
};

/**
 * Retry Failed LinkedIn Post
 * POST /api/linkedin/posts/:id/retry
 */
export const retryFailedPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await SocialPost.findOne({
      _id: postId,
      createdBy: userId,
      status: "failed",
    }).populate("socialAccountId");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Failed post not found",
      });
    }

    if (!post.canRetry) {
      return res.status(400).json({
        success: false,
        message: `Maximum retry attempts (${post.maxRetries}) reached`,
      });
    }

    // Refresh token if needed
    await refreshTokenIfNeeded(post.socialAccountId);

    // Fetch original Nexverce post for metadata
    let originalPost = null;
    try {
      if (post.nexvercePostType === "product") {
        originalPost = await Product.findById(post.nexvercePostId);
      } else if (post.nexvercePostType === "blog") {
        originalPost = await Blog.findById(post.nexvercePostId);
      } else if (post.nexvercePostType === "landingpage") {
        originalPost = await LandingPage.findById(post.nexvercePostId);
      }
    } catch (fetchError) {
      console.log("⚠️ Could not fetch original post:", fetchError.message);
    }

    // Reset status to posting
    post.status = "posting";
    post.errorMessage = undefined;
    await post.save();

    // Retry posting
    await postToLinkedInNow(post, post.socialAccountId, req.app.get("io"), originalPost);

    console.log(`🔄 LinkedIn post retry initiated: ${post._id}`);

    return res.json({
      success: true,
      message: "Retry initiated",
      post: post,
    });
  } catch (error) {
    console.error("❌ Error retrying LinkedIn post:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retry post",
    });
  }
};

/**
 * Sync Analytics for Specific Post
 * POST /api/linkedin/posts/:id/sync-analytics
 */
export const syncLinkedInAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.id;

    const post = await SocialPost.findOne({
      _id: postId,
      createdBy: userId,
      status: "posted",
    }).populate("socialAccountId");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Posted LinkedIn post not found",
      });
    }

    if (!post.linkedinPostId) {
      return res.status(400).json({
        success: false,
        message: "Post does not have a LinkedIn post ID",
      });
    }

    // Refresh token if needed
    await refreshTokenIfNeeded(post.socialAccountId);

    // Fetch analytics from LinkedIn
    await syncSinglePostAnalytics(post, post.socialAccountId);

    console.log(`📊 Analytics synced for post: ${post._id}`);

    return res.json({
      success: true,
      message: "Analytics synced successfully",
      analytics: post.analytics,
    });
  } catch (error) {
    console.error("❌ Error syncing analytics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sync analytics",
      error: error.message,
    });
  }
};

/**
 * Sync Single Post Analytics (Internal Function)
 */
async function syncSinglePostAnalytics(socialPost, socialAccount) {
  try {
    // Fetch analytics from LinkedIn
    const response = await axios.get(
      `${LINKEDIN_ANALYTICS_API}/${socialPost.linkedinPostId}`,
      {
        headers: {
          Authorization: `Bearer ${socialAccount.accessToken}`,
          "LinkedIn-Version": "202304",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    const stats = response.data;

    // Update analytics
    socialPost.analytics = {
      impressions: stats.impressionCount || 0,
      likes: stats.likeCount || 0,
      comments: stats.commentCount || 0,
      shares: stats.shareCount || 0,
      clicks: stats.clickCount || 0,
      engagementRate: socialPost.calculateEngagementRate(),
      lastSyncedAt: new Date(),
    };

    await socialPost.save();

    console.log(`✅ Analytics updated for post: ${socialPost._id}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync analytics for post ${socialPost._id}:`, error.message);
    return false;
  }
}

// Export internal functions for cron jobs
export { postToLinkedInNow, syncSinglePostAnalytics };
