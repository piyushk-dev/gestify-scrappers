import mongoose from "mongoose";

const horoscopeSchema = new mongoose.Schema({
  sign: {
    type: String,
    required: true,
    enum: [
      "aries", "taurus", "gemini", "cancer", "leo", "virgo",
      "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
    ]
  },
  title: String,
  link: String,
  story_summary: String,
  tags: [String],
  date: Date
});

export default mongoose.model("Horoscope", horoscopeSchema);
 