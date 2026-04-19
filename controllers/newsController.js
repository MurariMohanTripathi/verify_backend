import News from "../models/News.js";

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
