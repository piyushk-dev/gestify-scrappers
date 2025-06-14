import mongoose from "mongoose";

const scoreSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: [String],
  tags: [String],
  date: Date,
  image: String
});

const Score = mongoose.models.Score || mongoose.model("score", scoreSchema);
export default Score;
