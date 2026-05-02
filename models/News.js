import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String },
    source: { type: String },
    submittedBy: { type: String, default: "Anonymous" },
    submittedByUid: { type: String, index: true },
    submittedByEmail: { type: String },
    votes: {
      true: { type: Number, default: 0 },
      false: { type: Number, default: 0 },
      review: { type: Number, default: 0 },
    },
    moderation: {
      credibilityScore: { type: Number, min: 0, max: 100 },
      safetyScore: { type: Number, min: 0, max: 100 },
      summary: { type: String },
      checkedAt: { type: Date },
    },
    voterChoices: {
      type: Map,
      of: {
        type: String,
        enum: ["true", "false", "review"],
      },
      default: {},
      select: false,
    },
  },
  { timestamps: true }
);

const News = mongoose.model("News", newsSchema);
export default News;
