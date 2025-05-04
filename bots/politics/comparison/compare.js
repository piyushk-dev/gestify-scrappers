import { getCleanedArticles as thehindu } from "../thehindu/thehindu.js";
import { getCleanedArticles as indianexpress } from "../indian_express/indianexpress.js";
import { aiAgent } from "../../../Agent/index.js";
import fs from "fs/promises";
const prompt = `
You are an AI political news summarizer. You will be given articles from different sources covering the same topic or different.

Your tasks:
1. Generate a unified, unbiased "title" for the cluster.
2. Write a "story_summary" (8-9 lines max) that merges all views.
3. Provide an overall "sentiment" label and score.
4. Create a "source_articles" array with "source_name" and "url".
5. Extract "contrasting_views" in this format:
   - claim: "statement"
   - supporters: [source_names]
   - opposers: [source_names]
   - neutral: [source_names]
6. Add topic-based "tags".
7. Use the most recent article date.

If the articles are **not related**, do NOT cluster them. Instead, return an array of separate JSON article objects (as in the individual prompt).
If there are no contrasting views, return an empty array for "contrasting_views".
If there are no images, return null for "image".
- Use the format below for the output:

Output Example:
[
{
  "title": "Biden Unveils New Economic Policy Ahead of Election",
  "story_summary": "President Biden introduced a new economic policy aiming to support middle-class families. The policy has received mixed reactions across media outlets.",

  "sentiment": {
    "label": "neutral",
    "score": 0.05
  },
  "image": "https://example.com/image.jpg",

  "source_articles": [
    {
      "source_name": "CNN",
      "url": "https://cnn.com/article..."
    },
    {
      "source_name": "Fox News",
      "url": "https://foxnews.com/article..."
    },
    {
      "source_name": "Reuters",
      "url": "https://reuters.com/article..."
    }
  ],

  "contrasting_views": [
    {
      "claim": "The policy will boost the economy and support middle-class Americans.",
      "supporters": ["CNN"],
      "opposers": ["Fox News"],
      "neutral": ["Reuters"]
    },
    {
      "claim": "The plan may raise taxes and lacks detail.",
      "supporters": ["Fox News"],
      "opposers": [],
      "neutral": ["Reuters"]
    }
  ],

  "tags": ["biden", "economy", "2024 election"],
  "date": "2023-10-15"
},
]
`;

const calcDiff = async () => {
  const source1 = await thehindu();
  const source2 = await indianexpress();
  const articles = [
    {
      source: "The Hindu",
      articles: source1,
    },
    {
      source: "The Print",
      articles: source2,
    },
  ];

  const maxRetries = 3;
  let attempt = 0;
  let success = false;
  let cleanedOutput = "";
  let lastError = null;

  while (attempt < maxRetries && !success) {
    try {
      const aiResponse = await aiAgent(articles, prompt);
      cleanedOutput = aiResponse.replace(/```json|```/g, "").trim();
      const jsonData = JSON.parse(cleanedOutput);
      await fs.writeFile("final.json", JSON.stringify(jsonData, null, 2));
      console.log("✅ Article data saved to final.json");
      success = true;
      return jsonData;
    } catch (err) {
      attempt++;
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        console.log("🔄 Retrying...");
      }
    }
  }

  if (!success) {
    console.error(
      "❌ Failed to summarize using AI after retries:",
      lastError.message
    );
    await fs.writeFile(
      "invalid-output.txt",
      cleanedOutput || "No valid AI output received."
    );
    console.log("⚠️ Raw AI output saved to invalid-output.txt for debugging.");
  }
};

calcDiff();
