import mongoose from "mongoose";

const techSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: Date,
  image: String
});

const Tech = mongoose.models.Tech || mongoose.model("Tech", techSchema);
export default Tech;
