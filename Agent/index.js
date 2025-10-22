import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
export const aiAgent = async (data, prompt) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: prompt + "\n" + JSON.stringify(data),
  });
  return response.text;
};
// test
// aiAgent("", "how are yaa and which model are you on, the pro one? or flash").then((res) => console.log(res));
