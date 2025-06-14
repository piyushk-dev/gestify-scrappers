import mongoose from "mongoose";

const cricketSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String, 
  tags: [String],
  date: Date,
  image: String
});

export default mongoose.model("Cricket", cricketSchema);

