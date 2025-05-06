import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey:process.env.API_KEY });
export const aiAgent = async (data, prompt) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro-exp-03-25",
    contents: prompt + "\n" + JSON.stringify(data),
  });
  return response.text;
};
