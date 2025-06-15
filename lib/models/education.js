import mongoose from "mongoose";

const educationSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: {
    type: mongoose.Schema.Types.Mixed,
    default: () => new Date()
  },
  image: String
});

export default mongoose.model("Education", educationSchema);
