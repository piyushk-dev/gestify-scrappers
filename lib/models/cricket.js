import mongoose from "mongoose";

const cricketSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: [String], // explicitly an array
  tags: String,
  date: Date,
  image: String
});

const Cricket = mongoose.models.Cricket || mongoose.model("Cricket", cricketSchema);
export default Cricket;
