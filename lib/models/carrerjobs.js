import mongoose from "mongoose";

const careerJobSchema = new mongoose.Schema({
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: Date,
  image: String
});
 
export default mongoose.model("CareerJob", careerJobSchema);
