import mongoose from "mongoose";

const chessSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,  // Already a string
  tags: [String],
  date: Date,
  image: String
});

export default mongoose.model("Chess", chessSchema);
