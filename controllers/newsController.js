import News from "../models/News.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PASSING_SCORE = 50;
const MODERATION_MODEL = "gemini-flash-latest";

const extractJson = (value) => {
  const cleaned = value.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return JSON.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
};

const clampScore = (score) => {
  const number = Number(score);
  if (Number.isNaN(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
};

const moderateSubmission = async ({ title, url, source }) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODERATION_MODEL });

  const prompt = `
    You are a strict moderation and credibility gatekeeper for a public news verification platform.
    Analyze this user-submitted news claim before it is allowed into the community panel.

    Submission:
    Title/claim: "${title}"
    Source/platform: "${source || "Not provided"}"
    URL: "${url || "Not provided"}"

    Reject low-quality random text, spam, unrelated content, pornography or sexual content, abusive language, hate/harassment, violent threats, criminal instructions, scams, doxxing, and claims that are clearly fabricated or not credible enough for public voting.

    Return only a JSON object with this exact shape:
    {
      "credibilityScore": <number 0-100>,
      "safetyScore": <number 0-100>,
      "isFakeOrMisleading": <boolean>,
      "hasAbuseOrHarassment": <boolean>,
      "hasPornographicContent": <boolean>,
      "hasCriminalOrViolentContent": <boolean>,
      "isSpamOrNonsense": <boolean>,
      "decision": "approve" | "reject",
      "reason": "<short user-facing reason>"
    }
  `;

  const result = await model.generateContent(prompt);
  const aiData = extractJson(result.response.text());
  const credibilityScore = clampScore(aiData.credibilityScore);
  const safetyScore = clampScore(aiData.safetyScore);
  const blockedFlags = [
    aiData.isFakeOrMisleading,
    aiData.hasAbuseOrHarassment,
    aiData.hasPornographicContent,
    aiData.hasCriminalOrViolentContent,
    aiData.isSpamOrNonsense,
  ].some(Boolean);

  const approved =
    aiData.decision === "approve" &&
    credibilityScore >= PASSING_SCORE &&
    safetyScore >= PASSING_SCORE &&
    !blockedFlags;

  return {
    approved,
    credibilityScore,
    safetyScore,
    reason:
      aiData.reason ||
      (approved
        ? "Submission passed moderation."
        : "Submission did not meet the platform moderation standards."),
  };
};

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add news
export const submitNews = async (req, res) => {
  try {
    const { title, url, source, submittedBy } = req.body;
    const submitterName =
      submittedBy ||
      req.user?.name ||
      req.user?.email ||
      "Anonymous";

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const moderation = await moderateSubmission({ title, url, source });
    if (!moderation.approved) {
      return res.status(422).json({
        message: moderation.reason,
        moderation,
      });
    }

    const news = await News.create({
      title,
      url,
      source,
      submittedBy: submitterName,
      submittedByUid: req.user?.uid,
      submittedByEmail: req.user?.email,
      moderation: {
        credibilityScore: moderation.credibilityScore,
        safetyScore: moderation.safetyScore,
        summary: moderation.reason,
        checkedAt: new Date(),
      },
    });

    res.status(201).json({
      news,
      moderation,
      message: "News submitted after AI moderation.",
    });
  } catch (error) {
    console.error("Submit moderation error:", error);
    res.status(500).json({ message: "Unable to moderate this submission right now." });
  }
};

// Get news submitted by the logged-in user
export const getMyNews = async (req, res) => {
  try {
    const myNews = await News.find({ submittedByUid: req.user.uid }).sort({ createdAt: -1 });
    res.json(myNews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all news
export const getNews = async (req, res) => {
  try {
    const query = req.user ? News.find().select("+voterChoices") : News.find();
    const allNews = await query.sort({ createdAt: -1 });

    res.json(
      allNews.map((newsItem) => {
        const item = newsItem.toObject();
        item.currentUserVote = req.user
          ? newsItem.voterChoices?.get(req.user.uid) || null
          : null;
        delete item.voterChoices;
        return item;
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Vote on news
export const voteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // "true", "false", "review"
    const userId = req.user.uid;

    // Check if voting type is valid
    if (!["true", "false", "review"].includes(type)) {
      return res.status(400).json({ message: "Invalid vote type" });
    }

    const newsItem = await News.findById(id).select("+voterChoices");
    if (!newsItem) {
      return res.status(404).json({ message: "News not found" });
    }

    if (!newsItem.voterChoices) {
      newsItem.voterChoices = new Map();
    }

    const previousVote = newsItem.voterChoices.get(userId);

    if (previousVote === type) {
      newsItem.voterChoices.delete(userId);
      newsItem.votes[type] = Math.max((newsItem.votes[type] || 0) - 1, 0);
    } else {
      if (previousVote) {
        newsItem.votes[previousVote] = Math.max((newsItem.votes[previousVote] || 0) - 1, 0);
      }

      newsItem.voterChoices.set(userId, type);
      newsItem.votes[type] = (newsItem.votes[type] || 0) + 1;
    }

    await newsItem.save();

    const responseNews = newsItem.toObject();
    responseNews.currentUserVote = newsItem.voterChoices.get(userId) || null;
    delete responseNews.voterChoices;

    res.json({ success: true, news: responseNews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Remove the genAI variable from the top level!

export const factCheckNews = async (req, res) => {
  try {
    const { text } = req.body; 

    if (!text) {
      return res.status(400).json({ error: "Please provide a news title or claim to analyze." });
    }

    //  FIX: Initialize the AI INSIDE the function so process.env is fully loaded!
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are an expert fact-checking AI for a platform called TruthLens.
      The user will provide either a news headline, a claim, or a URL link. 
      
      If they provide a URL: Analyze the credibility of that specific domain/source and deduce the likely context from the URL slug.
      If they provide a title/claim: Cross-reference it with general knowledge to check for misinformation.
      
      User Input: "${text}"

      Return your analysis STRICTLY as a JSON object with the following structure, and nothing else. No markdown wrappers.
      {
        "credibilityScore": <number between 0-100, where 100 is fully credible>,
        "isLikelyFake": <boolean>,
        "summary": "<A 2-3 sentence explanation of why this is true, false, or suspicious>",
        "advice": "<Suggest 1 real, reputable source to verify this (e.g., 'Check Reuters or AP News')>"
      }
    `;

    const result = await model.generateContent(prompt);
    let aiResponse = result.response.text();

    aiResponse = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiData = JSON.parse(aiResponse);

    res.status(200).json({
      success: true,
      data: aiData
    });

  } catch (error) {
    console.error("AI Fact Check Error:", error);
    res.status(500).json({ error: "Failed to analyze the news. Please try again later." });
  }
};

export const chatAboutNews = async (req, res) => {
  try {
    const { originalClaim, userMessage } = req.body;

    if (!originalClaim || !userMessage) {
      return res.status(400).json({ error: "Missing claim or message." });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are TruthLens AI, an expert fact-checking assistant.
      Earlier, the user asked you to fact-check this claim: "${originalClaim}"
      
      Now, the user is arguing with you or asking for more details with this message:
      "${userMessage}"

      Respond to them directly, conversationally, and logically. Provide deeper details, defend your original stance, or concede if they make a valid point. Keep your response to 1-2 concise paragraphs. Do not use markdown formatting.
    `;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.status(200).json({ success: true, reply });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "Failed to connect to AI chat." });
  }
};



// Inside your factCheckNews function in backend/controllers/newsController.js

// const prompt = `
//   You are an expert fact-checking AI for a platform called TruthLens.
//   The user will provide either a news headline, a claim, or a URL link. 
  
//   If they provide a URL: Analyze the credibility of that specific domain/source and deduce the likely context from the URL slug.
//   If they provide a title/claim: Cross-reference it with general knowledge to check for misinformation.
  
//   User Input: "${text}"

//   Return your analysis STRICTLY as a JSON object with the following structure, and nothing else. No markdown wrappers.
//   {
//     "credibilityScore": <number between 0-100, where 100 is fully credible>,
//     "isLikelyFake": <boolean>,
//     "summary": "<A 2-3 sentence explanation of why this is true, false, or suspicious>",
//     "advice": "<Suggest 1 real, reputable source to verify this (e.g., 'Check Reuters or AP News')>"
//   }
// `;
