import { jobs_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";

const prompt = `
You are given a list of job-related news articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

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
- \`story_summary\` must be **concise yet complete**, similar to a news digest (8-9 lines max). Focus on the key points: what, when, where, who, and why.
- Keep \`tags\` lowercase, with no spaces or special characters. Use only relevant keywords (e.g., "jobs", "recruitment", "government", "hiring", "vacancy"). Do not exceed 4 tags.
- Only include the \`image\` field if a valid image URL is available.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

const getUrlsAndHeading = async (url) => {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const articles = [];
  $(".cartHolder.listView.track.timeAgo").each((_, el) => {
    const title = $(el).find("h3 a").text().trim();
    const itemlink = $(el).find("h3 a").attr("href");
    const dateText = $(el).find(".dateTime.secTime.ftldateTime").text().trim();
    const image = $(el).find("figure img").attr("src");

    if (title && itemlink && dateText) {
      // Match Published or Updated date in IST
      const match = dateText.match(/(Updated on|Published on) (.+?) IST/);
      const pubDate = match ? new Date(match[2]) : new Date(0);
      const link = `https://www.hindustantimes.com${itemlink}`;

      articles.push({ title, link, date: dateText, image, pubDate });
    }
  });

  // Remove duplicates by link
  const seen = new Set();
  const uniqueArticles = articles.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });

  // Sort newest first
  uniqueArticles.sort((a, b) => b.pubDate - a.pubDate);

  const now = new Date();
  const recent = uniqueArticles.filter(({ pubDate }) => {
    const diffDays = (now - pubDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  });

  return recent.length >= 10 ? recent : uniqueArticles.slice(0, 10);
};

const getContent = async (url) => {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const paragraphs = [];
    $("#storyMainDiv p").each((_, p) => {
      const text = $(p).text().trim();
      if (text) paragraphs.push(text);
    });

    return paragraphs.join(" ");
  } catch {
    return null;
  }
};

const getJobs = async () => {
  const meta = await getUrlsAndHeading(jobs_url);

  const results = await Promise.allSettled(
    meta.map(async (article) => {
      const content = await getContent(article.link);
      if (!content) return null;
      return {
        title: article.title,
        link: article.link,
        date: article.pubDate.toISOString().slice(0, 10),
        image: article.image,
        content,
      };
    })
  );

  const prepared = results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);

  if (prepared.length === 0) return [];

  let attempts = 0;
  let lastError;
  while (attempts < 4) {
    try {
      const aiResponse = await aiAgent(prepared, prompt);
      const cleaned = aiResponse.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    } catch (err) {
      lastError = err;
      attempts++;
      if(attempts>=4){
        throw new Error("AI processing failed: " + err.message);
      }
      if (attempts < 4) console.log("Retrying AI call...");
    }
  }

  console.error("Failed to get cleaned data after retries:", lastError?.message);
  return [];
};

// const job= await getJobs();
// console.log("Job Data:", job);
 
export { getJobs };
