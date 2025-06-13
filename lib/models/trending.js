import mongoose from "mongoose";

const trendingSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: Date,
  image: String,
  sentiment: { type: String, enum: ["positive", "neutral", "negative"] }
});

const Trending = mongoose.models.Trending || mongoose.model("Trending", trendingSchema);
export default Trending;
