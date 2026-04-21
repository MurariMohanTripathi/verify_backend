import News from "../models/News.js";
import { GoogleGenerativeAI } from "@google/generative-ai";


// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Add news
export const submitNews = async (req, res) => {
  try {
    const { title, url, source, submittedBy } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const news = await News.create({ title, url, source, submittedBy });
    res.status(201).json(news);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all news
export const getNews = async (req, res) => {
  try {
    const allNews = await News.find().sort({ createdAt: -1 });
    res.json(allNews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Vote on news
export const voteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // "true", "false", "review"

    // Check if voting type is valid
    if (!["true", "false", "review"].includes(type)) {
      return res.status(400).json({ message: "Invalid vote type" });
    }

    const newsItem = await News.findById(id);
    if (!newsItem) {
      return res.status(404).json({ message: "News not found" });
    }

    newsItem.votes[type] += 1;
    await newsItem.save();

    res.json({ success: true, news: newsItem });
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