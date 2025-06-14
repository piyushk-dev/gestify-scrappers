import mongoose from "mongoose";

const politicsSchema = new mongoose.Schema({
  title: String,
  story_summary: String,
  sentiment: {
    label: { type: String, enum: ["positive", "neutral", "negative"] },
    score: Number,
  },
  source_articles: [
    {
      source_name: String,
      url: String,
    },
  ],
  contrasting_views: [
    {
      claim: {
        type: String,
        required: false,
      },
      supporters: {
        type: [String],
        required: false,
        default: [],
      },
      opposers: {
        type: [String],
        required: false,
        default: [],
      },
      neutral: {
        type: [String],
        required: false,
        default: [],
      },
    },
  ],
  tags: [String],
  date: Date,
});

export default mongoose.model("Politics", politicsSchema);
