import { cricket_results_url } from "../../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../../Agent/index.js";
import fs from "fs/promises";
import { get } from "http";
import { json } from "stream/consumers";

const image = [
  "ipl",
  "t20",
  "odi",
  "bcci",
  "worldcup",
  "cricket",
  "champions-trophy",
];

const prompt = `
You are given a list of cricket score articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

[
  {
    "title": "<title of the article>",
    "link": "<URL of the article>",
    "story_summary": ["bullet point 1", "bullet point 2", "bullet point 3", "bullet point 4", "bullet point 5"],
    "tags": ["<relevant_tag_1>", "<relevant_tag_2>", "<relevant_tag_3>"],
    "date": "<date of the article in YYYY-MM-DD format>",
    "image": "Choose the most relevant enum from the list: ${image.join(", ")}"
  }
]

Instructions:
- \`story_summary\` provide the game score summary in bullet points (6-7 points max), if game data is not available then skip this article all together.
- \`story_summary\` should be statistical, and must contain all statistical scores/details of the game if available.
- \`tags\` must be lowercase, with no spaces or special characters. Use only relevant keywords (e.g., "cricket", "ipl", "t20", "odi", "bcci", "worldcup"). Max 3 tags per article.
- story_summary should not contain any personal opinions or subjective statements that much,it should be mostly statistical. 
- Choose the most relevant enum from the list: ${image.join(", ")}
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra text or formatting.
`;

// Extracts metadata (title, link, date, image) from articles on Chess.com
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const articles = [];
  $(".cb-view-all-ga").each((_, element) => {
    const title = $(element).find("a").attr("title");
    const itemlink = $(element).find("a").attr("href");
    if (title && itemlink) {
      const link = `https://www.cricbuzz.com${itemlink}`;
      articles.push({ title, link });
    }
  });

  // Remove duplicates based on the link
  const seen = new Set();
  const uniqueArticles = articles.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });

  return uniqueArticles;
};

// Extracts full article content
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];

    // get all text inside the div tag with class name cb-col cb-col-67 cb-nws-lft-col cb-comm-pg
    $(".cb-col.cb-col-67.cb-nws-lft-col.cb-comm-pg").each((_, element) => {
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
const getScore = async () => {
  const articlesMeta = await getUrlsAndHeading(cricket_results_url);
  const results = await Promise.allSettled(
    articlesMeta.map(async (article) => {
      const content = await getContent(article.link);
      if (!content){
        return null;
      } 
      return {
        title: article.title,
        link: article.link,
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
  let cleanedOutput = "";
  let lastError = null;

  while (attempt < maxRetries) {
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
      } else{
        throw new Error(`Failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
  return [];
};
// const cricket_results = await getScore();
// console.log(cricket_results);

export { getScore };


