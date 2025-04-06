import { GoogleGenAI } from "@google/genai";
import { API_KEY } from "../bots/URLs/Links.js";

const ai = new GoogleGenAI({ apiKey: API_KEY });

const defPrompt = "";

export const aiAgent = async (data, prompt) => {
//   console.log(JSON.stringify(data));
//   return "hello";
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt + "\n" + JSON.stringify(data),
  });
  return response.text;
};
