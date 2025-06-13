const mongoose = require("mongoose");

const careerJobSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: Date,
  image: String
});

module.exports = mongoose.model("CareerJob", careerJobSchema);
