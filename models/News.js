import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String },
    source: { type: String },
    submittedBy: { type: String, default: "Anonymous" },
    votes: {
      true: { type: Number, default: 0 },
      false: { type: Number, default: 0 },
      review: { type: Number, default: 0 },
    }
  },
  { timestamps: true }
);

const News = mongoose.model("News", newsSchema);
export default News;
