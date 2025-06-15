import { education_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";
import fs from "fs/promises";

const prompt = `
You are given a list of education news articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

[
  {
    "title": "<title of the article>",
    "link": "<URL of the article>",
    "story_summary": "<concise 8-9 line summary of the article>",
    "tags": ["<relevant_tag_1>", "<relevant_tag_2>", "<relevant_tag_3>"],
    "date": "<date of the article in YYYY-MM-DD format>",
    "image": "<optional image URL if available>"
  }
]

Instructions:
- \`story_summary\` must be **concise yet complete**, similar to a news digest (8-9 lines max). Focus on the key points: what, when, where, and why.
- Keep \`tags\` lowercase, with no spaces or special characters. Use only relevant keywords (e.g., "education", "exams", "results", "admissions", "ranking"). Do not exceed 3 tags.
- Only include the \`image\` field if a valid image URL is available.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

// Extracts articles from the given URL
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const articles = [];
  $(".cartHolder.listView.noAd").each((_, element) => {
    const title = $(element).find("h3 a").text();
    const itemlink = $(element).find("h3 a").attr("href");
    const date = $(element).find(".dateTime.secTime.ftldateTime").text() || "NA";
    const image = $(element).find("figure img").attr("src") || "NA"
    if (title && itemlink && date && image) {
      const match = date.trim().match(/(Updated on|Published on) (.+?) IST/);
      const link = `https://www.hindustantimes.com${itemlink}`;
      const pubDate = match ? new Date(match[2]) : new Date(0);
      articles.push({ title, link, date, image, pubDate });
      // console.log({ title, link, date, image, pubDate });
    }
  });

  const seen = new Set();
  const uniqueArticles = articles.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });
  // Sort by most recent
  uniqueArticles.sort((a, b) => b.pubDate - a.pubDate);

  const now = new Date();
  // const recent = uniqueArticles.filter(({ pubDate }) => {
  //   const diffDays = (now - pubDate) / (1000 * 60 * 60 * 24);
  //   return diffDays <= 2;
  // });
  return uniqueArticles.slice(0, 10);
};

// Extracts main content from the article's page
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];

    $("#storyMainDiv p").each((_, el) => {
      const text = $(el).text().trim();
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

const getEdu = async () => {
  const articlesMeta = await getUrlsAndHeading(education_url);

  const results = await Promise.allSettled(
    articlesMeta.map(async (article) => {
      const content = await getContent(article.link);
      if (!content) return null;
      return {
        title: article.title,
        link: article.link,
        date: article.pubDate.toISOString().split("T")[0] || "NA",
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
      return jsonData;
    } catch (err) {
      attempt++;
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        console.log("🔄 Retrying...");
      }
      if(attempt>= maxRetries) {
        throw new Error("AI processing failed: " + err.message);
      }
    }
  }
  return [];
 
};

export { getEdu };