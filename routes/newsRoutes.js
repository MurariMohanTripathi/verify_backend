import express from "express";
import { submitNews, getNews, voteNews } from "../controllers/newsController.js";

const router = express.Router();

router.post("/submit", submitNews);
router.get("/", getNews);
router.post("/:id/vote", voteNews);

export default router;
