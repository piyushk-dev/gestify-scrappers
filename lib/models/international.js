import mongoose from "mongoose";

const internationalSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: Date,
  image: String
});

export default mongoose.model("International", internationalSchema);
