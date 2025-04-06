import { chess_url } from "../../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../../Agent/index.js";
import fs from "fs/promises";

// Extracts metadata (title, link, date, image) from articles on Chess.com
const getUrlsAndHeading = async (url) => {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];
  
    $("article.post-preview-component").each((_, el) => {
      const title = $(el).find("a.post-preview-title").text().trim();
      const link = $(el).find("a.post-preview-title").attr("href")?.trim();
      const image = $(el).find("img.post-preview-thumbnail").attr("src")?.trim();
      const dateText = $(el).find("time").attr("datetime");
  
      if (title && link && image && dateText) {
        const pubDate = new Date(dateText);
        articles.push({
          title,
          link,
          image,
          date: pubDate.toISOString().split("T")[0],
          pubDate,
        });
      }
    });
  
    // Sort by most recent
    articles.sort((a, b) => b.pubDate - a.pubDate);
  
    const recent = articles.filter(({ pubDate }) => {
      const now = new Date();
      const diffDays = (now - pubDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 2;
    });
  
    if (recent.length >= 2){
      console.log(recent.slice(0, 5));
    } 
    const fallback = articles.slice(0, 5); // Top 5 overall
    console.log(fallback);
  };

getUrlsAndHeading(chess_url);
// Extracts full article content
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];

    $(".article-content-container p").each((_, el) => {
      const text = $(el).text().trim();
      if (text) paragraphs.push(text);
    });

    return paragraphs.join(" ");
  } catch (err) {
    console.error("❌ Failed to extract content from:", url, err.message);
    return null;
  }
};

// AI summarization prompt
const prompt = `
You are given a list of chess news articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

[
  {
    "title": "<title of the article>",
    "link": "<URL of the article>",
    "story_summary": "<concise 6-7 line summary of the article>",
    "tags": ["<relevant_tag_1>", "<relevant_tag_2>", "<relevant_tag_3>"],
    "date": "<date of the article in YYYY-MM-DD format>",
    "image": "<optional image URL if available>"
  }
]

Instructions:
- \`story_summary\` must be **concise yet complete**, similar to a news digest (6-7 lines max). Focus on the key points: what, when, where, and why.
- Keep \`tags\` lowercase, with no spaces or special characters. Use only relevant keywords (e.g., "chess", "tournament", "gm", "championship"). Do not exceed 3 tags.
- Only include the \`image\` field if a valid image URL is available.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

const getCleanedArticles = async () => {
  const articlesMeta = await getUrlsAndHeading(chess_url);
  const preparedArticles = [];

  for (const article of articlesMeta) {
    const content = await getContent(article.link);
    if (!content) {
      console.error("❌ Failed to extract content from:", article.link);
      continue;
    }

    preparedArticles.push({
      title: article.title,
      link: article.link,
      date: article.date,
      image: article.image,
      content,
    });
  }

  try {
    const aiResponse = await aiAgent(preparedArticles, prompt);
    const cleanedOutput = aiResponse.replace(/```json|```/g, "").trim();

    try {
      const json = JSON.parse(cleanedOutput);
      await fs.writeFile("test.json", JSON.stringify(json, null, 2));
      console.log("✅ Chess news saved to test.json");
    } catch (parseErr) {
      console.error("❌ Invalid JSON from AI:", parseErr.message);
      await fs.writeFile("invalid-output.txt", cleanedOutput);
      console.log("⚠️ Raw AI output saved to invalid-output.txt for debugging.");
    }
  } catch (err) {
    console.error("❌ Failed to summarize using AI:", err.message);
  }
};
