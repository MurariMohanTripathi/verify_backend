import express from "express";
import { submitNews, getNews, voteNews ,factCheckNews,chatAboutNews } from "../controllers/newsController.js";

const router = express.Router();

router.post("/submit", submitNews);
router.get("/", getNews);
router.post("/fact-check", factCheckNews);
router.post("/:id/vote", voteNews);
router.post("/chat", chatAboutNews);
export default router;
