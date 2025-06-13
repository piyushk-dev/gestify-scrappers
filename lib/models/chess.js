const mongoose = require("mongoose");

const chessSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,  // Already a string
  tags: [String],
  date: Date,
  image: String
});

module.exports = mongoose.model("Chess", chessSchema);
