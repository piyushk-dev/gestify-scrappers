import { trending_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";
import fs from "fs/promises";

const prompt = `
You are given a list of trending news articles from a general news page. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

[
  {
    "title": "<title of the article>",
    "link": "<URL of the article>",
    "story_summary": "<concise 8-9 line summary of the article>",
    "tags": ["<relevant_tag_1>", "<relevant_tag_2>", "<relevant_tag_3>"],
    "date": "<date of the article in YYYY-MM-DD format>",
    "sentiment": "<positive|negative|neutral>
    "image": "<image URL if available, otherwise omit it>"
  }
]

Instructions:
- \`story_summary\` must be **concise yet complete**, similar to a news digest (8-9 lines max). Focus on key details: what happened, who was involved, when, where, and why it matters.
- \`tags\` must be lowercase, no spaces or special characters. Use only relevant keywords (e.g., "politics", "sports", "technology", "entertainment", "business", "health", "world"). Do not exceed 3 tags.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

// Extracts metadata (title, link, date, image) from articles on Chess.com
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const data = await response.json();
  //   console.log(data);
  //x.items[0].headline x.items[0].storyURL x.items[0].publishDate x.items[0].keywords x.items[0].imageObject.original
  const articles = data.items.map((item) => ({
    title: item.headline,
    link: item.storyURL,
    pubDate: new Date(item.publishDate),
    image: item.imageObject?.original || null,
  }));
  const seen = new Set();
  const uniqueArticles = articles.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });
  uniqueArticles.sort((a, b) => b.pubDate - a.pubDate);
  const now = new Date();
  const recent = uniqueArticles.filter(({ pubDate }) => {
    const diffDays = (now - pubDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  });

  return uniqueArticles.slice(0, 15);
};

// Extracts full article content
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];
    $(".storyParagraph").each((_, element) => {
      const text = $(element).text().trim();
      if (text) {
        paragraphs.push(text);
      }
    });
    return paragraphs.join(" ");
  } catch (err) {
    console.error("❌ Failed to extract content from:", url, err.message);
    return null;
  }
};
const getTrending = async () => {
  const articlesMeta = await getUrlsAndHeading(trending_url);
  const results = await Promise.allSettled(
    articlesMeta.map(async (article) => {
      const content = await getContent(article.link);
      if (!content) return null;
      return {
        title: article.title,
        link: article.link,
        date: article.pubDate.toISOString().split("T")[0],
        image: article.image,
        content,
      };
    })
  );
  const preparedArticles = results
    .filter((res) => res.status === "fulfilled" && res.value)
    .map((res) => res.value);

  if (preparedArticles.length === 0) {
    console.error("⚠️ No articles to process.");
    return;
  }

  const maxRetries = 4;
  let attempt = 0;
  let success = false;
  let cleanedOutput = "";
  let lastError = null;

  while (attempt < maxRetries && !success) {
    try {
      const aiResponse = await aiAgent(preparedArticles, prompt);
      cleanedOutput = aiResponse.replace(/```json|```/g, "").trim();
      const jsonData = JSON.parse(cleanedOutput);
      // console.log(jsonData);
      success = true;
      return jsonData;
    } catch (err) {
      attempt++;
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        console.log("🔄 Retrying...");
      } else{
        throw new Error(`Failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
  return [];
};

export { getTrending };

