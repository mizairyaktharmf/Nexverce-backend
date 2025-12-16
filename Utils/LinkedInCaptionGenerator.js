import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate LinkedIn caption using AI
 * @param {Object} post - The Nexverce post object (Product/Blog/LandingPage)
 * @param {String} postType - Type of post ("product", "blog", "landingpage")
 * @param {Object} userSettings - User's LinkedIn settings (optional)
 * @returns {Object} - { caption, hashtags, rawCaption }
 */
export async function generateLinkedInCaption(post, postType, userSettings = {}) {
  try {
    // Extract content from post
    const title = post.title || "";
    const excerpt = post.excerpt || post.description || "";
    const category = post.category || "General";
    const slug = post.slug || "";

    // Build target URL with UTM tracking
    const baseUrl = `https://nexverce.com/${postType}/${slug}`;
    const targetUrl = userSettings.buildTrackingUrl
      ? userSettings.buildTrackingUrl(baseUrl)
      : `${baseUrl}?utm_source=linkedin&utm_medium=social&utm_campaign=autopost`;

    // Generate hashtags based on category
    const hashtags = generateHashtags(category, postType, userSettings);

    // Check if AI generation is disabled
    if (userSettings.useAIGeneration === false) {
      return createFallbackCaption(title, excerpt, targetUrl, hashtags, userSettings);
    }

    // Build AI prompt
    const prompt = buildAIPrompt(title, excerpt, category, postType, userSettings);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a LinkedIn content strategist specialized in creating high-engagement posts for B2B and professional audiences. You understand LinkedIn's algorithm and what drives engagement.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    const rawCaption = response.choices[0].message.content.trim();

    // Build final caption
    const finalCaption = buildFinalCaption(rawCaption, targetUrl, hashtags, userSettings);

    console.log(`✅ AI caption generated for ${postType}: ${title.substring(0, 50)}...`);

    return {
      caption: finalCaption,
      hashtags: hashtags,
      rawCaption: rawCaption,
      metadata: {
        generatedByAI: true,
        model: "gpt-4o-mini",
        category: category,
        postType: postType,
      },
    };
  } catch (error) {
    console.error("❌ AI caption generation failed:", error.message);

    // Return fallback caption on error
    return createFallbackCaption(
      post.title,
      post.excerpt || post.description,
      `https://nexverce.com/${postType}/${post.slug}`,
      generateHashtags(post.category, postType, userSettings),
      userSettings
    );
  }
}

/**
 * Build AI prompt for caption generation
 */
function buildAIPrompt(title, excerpt, category, postType, userSettings) {
  const includeEmojis = userSettings.includeEmojis !== false;

  let prompt = `Create a professional, engaging LinkedIn caption for this ${postType}:\n\n`;
  prompt += `Title: ${title}\n`;
  if (excerpt) {
    prompt += `Excerpt: ${excerpt}\n`;
  }
  prompt += `Category: ${category}\n\n`;

  prompt += `Requirements:\n`;
  prompt += `- 2-4 lines maximum (keep it concise)\n`;
  prompt += `- Professional and engaging tone\n`;
  prompt += `- Clear value proposition\n`;
  prompt += `- Include a call-to-action\n`;

  if (includeEmojis) {
    prompt += `- Use 1-2 relevant emojis (subtle, professional)\n`;
  } else {
    prompt += `- Do NOT use any emojis\n`;
  }

  prompt += `- Do NOT include hashtags (we'll add them separately)\n`;
  prompt += `- Do NOT include the URL (we'll add it separately)\n`;
  prompt += `- Focus on why this content is valuable to the reader\n\n`;

  // Add specific guidance based on post type
  if (postType === "product") {
    prompt += `This is a product review/recommendation. Highlight the key benefits and value.\n`;
  } else if (postType === "blog") {
    prompt += `This is a blog post. Tease the main insight or learning without giving it all away.\n`;
  } else if (postType === "landingpage") {
    prompt += `This is a landing page/campaign. Create urgency and highlight the transformation or outcome.\n`;
  }

  prompt += `\nReturn only the caption text, no quotes or extra formatting.`;

  return prompt;
}

/**
 * Build final caption with URL and hashtags
 */
function buildFinalCaption(rawCaption, targetUrl, hashtags, userSettings) {
  let caption = rawCaption.trim();

  // Add URL with CTA emoji
  caption += `\n\n👉 Read more: ${targetUrl}`;

  // Add hashtags if enabled
  if (userSettings.includeHashtags !== false && hashtags.length > 0) {
    caption += `\n\n${hashtags.join(" ")}`;
  }

  return caption;
}

/**
 * Create fallback caption when AI fails
 */
function createFallbackCaption(title, excerpt, targetUrl, hashtags, userSettings) {
  let caption = `${title}`;

  if (excerpt) {
    const shortExcerpt = excerpt.length > 150 ? excerpt.substring(0, 150) + "..." : excerpt;
    caption += `\n\n${shortExcerpt}`;
  }

  caption += `\n\n👉 Read more: ${targetUrl}`;

  if (userSettings.includeHashtags !== false && hashtags.length > 0) {
    caption += `\n\n${hashtags.join(" ")}`;
  }

  return {
    caption: caption,
    hashtags: hashtags,
    rawCaption: title + (excerpt ? `\n\n${excerpt}` : ""),
    metadata: {
      generatedByAI: false,
      fallback: true,
    },
  };
}

/**
 * Generate relevant hashtags based on category and post type
 */
function generateHashtags(category, postType, userSettings = {}) {
  const maxHashtags = userSettings.maxHashtags || 5;

  // Category-specific hashtags
  const categoryHashtagMap = {
    // Product categories
    "Tech": ["#Technology", "#Innovation", "#TechGadgets", "#TechReview", "#DigitalTransformation"],
    "Health": ["#Health", "#Wellness", "#HealthTech", "#HealthyLiving", "#WellnessJourney"],
    "Finance": ["#Finance", "#FinTech", "#PersonalFinance", "#FinancialFreedom", "#MoneyMatters"],
    "Travel": ["#Travel", "#TravelTips", "#Wanderlust", "#TravelGuide", "#ExploreTheWorld"],
    "Fashion": ["#Fashion", "#Style", "#FashionTrends", "#FashionInspo", "#StyleGuide"],
    "Food": ["#Food", "#Foodie", "#FoodReview", "#Cooking", "#FoodLovers"],
    "Fitness": ["#Fitness", "#Workout", "#FitnessMotivation", "#HealthyLifestyle", "#FitnessJourney"],
    "Beauty": ["#Beauty", "#Skincare", "#BeautyTips", "#SelfCare", "#BeautyProducts"],
    "Home": ["#Home", "#HomeDecor", "#InteriorDesign", "#HomeImprovement", "#HomeInspiration"],
    "Education": ["#Education", "#Learning", "#EdTech", "#OnlineLearning", "#SkillDevelopment"],

    // Blog/Business categories
    "Marketing": ["#Marketing", "#DigitalMarketing", "#ContentMarketing", "#MarketingStrategy", "#SocialMediaMarketing"],
    "Business": ["#Business", "#Entrepreneurship", "#Leadership", "#BusinessGrowth", "#StartupLife"],
    "Productivity": ["#Productivity", "#TimeManagement", "#WorkLifeBalance", "#ProductivityTips", "#Efficiency"],
    "Career": ["#Career", "#CareerDevelopment", "#CareerAdvice", "#ProfessionalGrowth", "#JobSearch"],
    "Technology": ["#Technology", "#Tech", "#Innovation", "#DigitalTransformation", "#FutureTech"],
    "Lifestyle": ["#Lifestyle", "#SelfImprovement", "#PersonalDevelopment", "#LifeHacks", "#Inspiration"],
    "Sustainability": ["#Sustainability", "#EcoFriendly", "#GreenLiving", "#ClimateAction", "#SustainableLiving"],
  };

  // Get category hashtags
  let hashtags = categoryHashtagMap[category] || ["#Nexverce", "#Insights", "#DiscoverMore"];

  // Add post type specific hashtags
  if (postType === "product") {
    hashtags.push("#ProductReview", "#Recommendations");
  } else if (postType === "blog") {
    hashtags.push("#BlogPost", "#ReadMore");
  } else if (postType === "landingpage") {
    hashtags.push("#CampaignAlert", "#LimitedOffer");
  }

  // Always add brand hashtag
  if (!hashtags.includes("#Nexverce")) {
    hashtags.unshift("#Nexverce");
  }

  // Limit to max hashtags
  return hashtags.slice(0, maxHashtags);
}

/**
 * Generate a short caption for preview (without full content)
 */
export function generatePreviewCaption(post, postType) {
  const title = post.title || "Check out our latest post!";
  const slug = post.slug || "";
  const url = `https://nexverce.com/${postType}/${slug}`;

  return `${title}\n\n👉 ${url}\n\n#Nexverce`;
}

export default {
  generateLinkedInCaption,
  generatePreviewCaption,
};
