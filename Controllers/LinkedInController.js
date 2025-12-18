import SocialAccount from "../Models/SocialAccount.js";
import LinkedInSettings from "../Models/LinkedInSettings.js";
import axios from "axios";

// LinkedIn OAuth Configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "mock_client_id";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "mock_client_secret";
const REDIRECT_URI = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/linkedin/callback`;

// LinkedIn API Base URLs
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

/**
 * Initiate LinkedIn OAuth Flow
 * GET /api/linkedin/auth
 */
export const initiateLinkedInAuth = async (req, res) => {
  try {
    const userId = req.user.id;

    // Create state parameter with user ID for security
    const state = Buffer.from(
      JSON.stringify({
        userId: userId,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // LinkedIn OAuth scopes needed
    const scope = "openid profile email w_member_social";

    // Build authorization URL
    const authUrl =
      `${LINKEDIN_AUTH_URL}?` +
      `response_type=code&` +
      `client_id=${LINKEDIN_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${state}&` +
      `scope=${encodeURIComponent(scope)}`;

    console.log(`🔐 LinkedIn OAuth initiated for user: ${userId}`);

    return res.json({
      success: true,
      authUrl: authUrl,
    });
  } catch (error) {
    console.error("❌ LinkedIn auth initiation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate LinkedIn authentication",
    });
  }
};

/**
 * Handle LinkedIn OAuth Callback
 * GET /api/linkedin/callback
 */
export const handleLinkedInCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error(`❌ LinkedIn OAuth error: ${error} - ${error_description}`);
      return res.redirect(
        `${process.env.FRONTEND_URL}/settings?linkedin_error=${error}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/settings?linkedin_error=missing_params`
      );
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return res.redirect(
        `${process.env.FRONTEND_URL}/settings?linkedin_error=invalid_state`
      );
    }

    const userId = stateData.userId;

    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      LINKEDIN_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in, refresh_token } = tokenResponse.data;

    // Calculate token expiry date
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Get LinkedIn user profile
    const userInfoResponse = await axios.get(LINKEDIN_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const linkedinUser = userInfoResponse.data;

    // Check if account already exists
    const existingAccount = await SocialAccount.findOne({
      userId: userId,
      platform: "linkedin",
      linkedinUserId: linkedinUser.sub,
    });

    let socialAccount;

    if (existingAccount) {
      // Update existing account
      existingAccount.accessToken = access_token;
      existingAccount.refreshToken = refresh_token || existingAccount.refreshToken;
      existingAccount.expiresAt = expiresAt;
      existingAccount.accountName = linkedinUser.name;
      existingAccount.accountEmail = linkedinUser.email;
      existingAccount.profileImageUrl = linkedinUser.picture;
      existingAccount.isActive = true;
      existingAccount.lastSyncedAt = new Date();
      existingAccount.scopes = ["openid", "profile", "email", "w_member_social"];
      existingAccount.lastError = undefined;
      existingAccount.errorCount = 0;

      socialAccount = await existingAccount.save();
      console.log(`✅ LinkedIn account reconnected: ${linkedinUser.email}`);
    } else {
      // Create new account
      socialAccount = await SocialAccount.create({
        userId: userId,
        platform: "linkedin",
        accountType: "personal",
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        linkedinUserId: linkedinUser.sub,
        accountName: linkedinUser.name,
        accountEmail: linkedinUser.email,
        profileImageUrl: linkedinUser.picture,
        isActive: true,
        lastSyncedAt: new Date(),
        scopes: ["openid", "profile", "email", "w_member_social"],
      });

      console.log(`✅ New LinkedIn account connected: ${linkedinUser.email}`);
    }

    // Create or update LinkedIn settings
    let settings = await LinkedInSettings.findOne({ userId: userId });
    if (!settings) {
      settings = await LinkedInSettings.create({
        userId: userId,
        autoPostEnabled: false,
        defaultAccountId: socialAccount._id,
      });
    } else if (!settings.defaultAccountId) {
      settings.defaultAccountId = socialAccount._id;
      await settings.save();
    }

    // Redirect to frontend with success
    return res.redirect(
      `${process.env.FRONTEND_URL}/settings?linkedin_success=true&account_id=${socialAccount._id}`
    );
  } catch (error) {
    console.error("❌ LinkedIn callback error:", error.response?.data || error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/settings?linkedin_error=auth_failed`
    );
  }
};

/**
 * Get Connected LinkedIn Accounts
 * GET /api/linkedin/accounts
 */
export const getConnectedAccounts = async (req, res) => {
  try {
    const userId = req.user.id;

    const accounts = await SocialAccount.find({
      userId: userId,
      platform: "linkedin",
      isActive: true, // Only return active accounts
    }).select("-accessToken -refreshToken"); // Hide sensitive tokens

    // Add token expiry status
    const accountsWithStatus = accounts.map((account) => ({
      ...account.toObject(),
      isExpired: account.isTokenExpired,
      needsRefresh: account.needsRefresh(),
    }));

    return res.json({
      success: true,
      accounts: accountsWithStatus,
      count: accounts.length,
    });
  } catch (error) {
    console.error("❌ Error fetching LinkedIn accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LinkedIn accounts",
    });
  }
};

/**
 * Disconnect LinkedIn Account
 * DELETE /api/linkedin/accounts/:accountId
 */
export const disconnectLinkedInAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.accountId;

    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: userId,
      platform: "linkedin",
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "LinkedIn account not found",
      });
    }

    // Hard delete - completely remove the account
    await account.deleteOne();

    console.log(`🔌 LinkedIn account deleted: ${account.accountEmail}`);

    return res.json({
      success: true,
      message: "LinkedIn account disconnected successfully",
    });
  } catch (error) {
    console.error("❌ Error disconnecting LinkedIn account:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to disconnect LinkedIn account",
    });
  }
};

/**
 * Refresh LinkedIn Access Token
 * POST /api/linkedin/refresh-token/:accountId
 */
export const refreshLinkedInToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.accountId;

    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: userId,
      platform: "linkedin",
      isActive: true,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "LinkedIn account not found",
      });
    }

    if (!account.refreshToken) {
      return res.status(400).json({
        success: false,
        message: "No refresh token available. Please reconnect your account.",
      });
    }

    // Refresh the token
    const tokenResponse = await axios.post(
      LINKEDIN_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in, refresh_token } = tokenResponse.data;

    // Update account with new tokens
    account.accessToken = access_token;
    if (refresh_token) {
      account.refreshToken = refresh_token;
    }
    account.expiresAt = new Date(Date.now() + expires_in * 1000);
    account.lastSyncedAt = new Date();
    account.lastError = undefined;
    account.errorCount = 0;

    await account.save();

    console.log(`🔄 LinkedIn token refreshed: ${account.accountEmail}`);

    return res.json({
      success: true,
      message: "Token refreshed successfully",
      expiresAt: account.expiresAt,
    });
  } catch (error) {
    console.error("❌ Token refresh failed:", error.response?.data || error.message);

    // Update error tracking
    if (req.params.accountId) {
      const account = await SocialAccount.findById(req.params.accountId);
      if (account) {
        account.lastError = error.response?.data?.error_description || error.message;
        account.errorCount += 1;
        await account.save();
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to refresh token. Please reconnect your account.",
    });
  }
};

/**
 * Get LinkedIn Settings
 * GET /api/linkedin/settings
 */
export const getLinkedInSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await LinkedInSettings.findOne({ userId: userId }).populate(
      "defaultAccountId",
      "-accessToken -refreshToken"
    );

    // Create default settings if none exist
    if (!settings) {
      settings = await LinkedInSettings.create({
        userId: userId,
      });
    }

    return res.json({
      success: true,
      settings: settings,
    });
  } catch (error) {
    console.error("❌ Error fetching LinkedIn settings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LinkedIn settings",
    });
  }
};

/**
 * Update LinkedIn Settings
 * PUT /api/linkedin/settings
 */
export const updateLinkedInSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    let settings = await LinkedInSettings.findOne({ userId: userId });

    if (!settings) {
      settings = await LinkedInSettings.create({
        userId: userId,
        ...updates,
      });
    } else {
      Object.assign(settings, updates);
      await settings.save();
    }

    console.log(`⚙️ LinkedIn settings updated for user: ${userId}`);

    return res.json({
      success: true,
      message: "Settings updated successfully",
      settings: settings,
    });
  } catch (error) {
    console.error("❌ Error updating LinkedIn settings:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update LinkedIn settings",
    });
  }
};

/**
 * Utility: Refresh token if needed (used by other controllers)
 */
export async function refreshTokenIfNeeded(account) {
  if (!account.needsRefresh()) {
    return account;
  }

  try {
    const tokenResponse = await axios.post(
      LINKEDIN_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in, refresh_token } = tokenResponse.data;

    account.accessToken = access_token;
    if (refresh_token) {
      account.refreshToken = refresh_token;
    }
    account.expiresAt = new Date(Date.now() + expires_in * 1000);
    account.lastSyncedAt = new Date();
    account.lastError = undefined;
    account.errorCount = 0;

    await account.save();

    console.log(`🔄 Auto-refreshed token for: ${account.accountEmail}`);
    return account;
  } catch (error) {
    console.error("❌ Auto token refresh failed:", error.message);
    account.lastError = error.message;
    account.errorCount += 1;
    await account.save();
    throw error;
  }
}
