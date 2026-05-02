import express from "express";
import {
  submitNews,
  getNews,
  getMyNews,
  voteNews,
  factCheckNews,
  chatAboutNews,
  getHeadlines,
} from "../controllers/newsController.js";
import { optionalFirebaseAuth, requireFirebaseAuth } from "../middleware/firebaseAuth.js";

const router = express.Router();

router.post("/submit", optionalFirebaseAuth, submitNews);
router.get("/mine", requireFirebaseAuth, getMyNews);
router.get("/headlines", getHeadlines);
router.get("/", optionalFirebaseAuth, getNews);
router.post("/fact-check", factCheckNews);
router.post("/:id/vote", requireFirebaseAuth, voteNews);
router.post("/chat", chatAboutNews);
export default router;
