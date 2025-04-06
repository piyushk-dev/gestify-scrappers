import { education_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";
import fs from "fs/promises";

// Extracts articles from the given URL
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const articles = [];

  $(".cartHolder.listView.noAd").each((_, element) => {
    const title = $(element).find("h3 a").text();
    const link = $(element).find("h3 a").attr("href");
    const date = $(element).find(".dateTime.secTime.ftldateTime").text();
    const image = $(element).find("figure img").attr("src");

    if (title && link && date && image) {
      articles.push({ title, link, date, image });
    }
  });

  const seen = new Set();
  const uniqueArticles = articles.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });

  const now = new Date();

  uniqueArticles.forEach((article) => {
    const match = article.date.trim().match(/(Updated on|Published on) (.+?) IST/);
    article.pubDate = match ? new Date(match[2]) : new Date(0);
  });

  uniqueArticles.sort((a, b) => b.pubDate - a.pubDate);

  const recentArticles = uniqueArticles.filter(({ pubDate }) => {
    const diffDays = (now - pubDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  });

  const recentLinks = new Set(recentArticles.map((a) => a.link));
  const finalArticles =
    recentArticles.length >= 10
      ? recentArticles
      : [
          ...recentArticles,
          ...uniqueArticles.filter((a) => !recentLinks.has(a.link)),
        ].slice(0, 10);

  finalArticles.forEach((item) => {
    item.link = `https://www.hindustantimes.com${item.link}`;
  });

  return finalArticles;
};

// Extracts main content from the article's page
const getContent = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const paragraphs = [];

  $("#storyMainDiv p").each((_, el) => {
    paragraphs.push($(el).text());
  });

  return paragraphs.join(" ");
};

// Retry wrapper for AI agent
const withAiRetries = async (input, prompt, retries = 3, delay = 1000) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await aiAgent(input, prompt);
    } catch (err) {
      attempt++;
      console.error(`⚠️ AI agent failed (attempt ${attempt}): ${err.message}`);
      if (attempt >= retries) throw err;
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

const prompt = `
You are given a list of education news articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

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
- Keep \`tags\` lowercase, with no spaces or special characters. Use only relevant keywords (e.g., "education", "exams", "results", "admissions", "ranking"). Do not exceed 3 tags.
- Only include the \`image\` field if a valid image URL is available.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

const getCleanedArticles = async () => {
  const articlesMeta = await getUrlsAndHeading(education_url);

  const results = await Promise.allSettled(
    articlesMeta.map(async (article) => {
      try {
        const content = await getContent(article.link);
        return {
          title: article.title,
          link: article.link,
          date: article.pubDate.toISOString().split("T")[0],
          image: article.image,
          content,
        };
      } catch (err) {
        console.error("❌ Failed to extract content from:", article.link);
        return null;
      }
    })
  );

  const preparedArticles = results
    .filter((res) => res.status === "fulfilled" && res.value)
    .map((res) => res.value);

  if (preparedArticles.length === 0) {
    console.error("⚠️ No articles to process.");
    return;
  }

  try {
    const aiResponse = await withAiRetries(preparedArticles, prompt);
    const cleanedOutput = aiResponse.replace(/```json|```/g, "").trim();

    try {
      const json = JSON.parse(cleanedOutput);
      await fs.writeFile("test.json", JSON.stringify(json, null, 2));
      console.log("✅ Article data saved to test.json");
    } catch (parseErr) {
      console.error("❌ Invalid JSON from AI:", parseErr.message);
      await fs.writeFile("invalid-output.txt", cleanedOutput);
      console.log("⚠️ Raw AI output saved to invalid-output.txt for debugging.");
    }
  } catch (err) {
    console.error("❌ Failed to summarize using AI after retries:", err.message);
  }
};

getCleanedArticles();
