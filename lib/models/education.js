const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: Date,
  image: String
});

module.exports = mongoose.model("Education", educationSchema);
