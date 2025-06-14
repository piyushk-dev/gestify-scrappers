import { cricket_article_url } from "../../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../../Agent/index.js";

const prompt = `
You are given a list of cricket news articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

[
  {
    "title": "<title of the article>",
    "link": "<URL of the article>",
    "story_summary": "<concise 8-9 line summary of the article>",
    "tags": ["<relevant_tag_1>", "<relevant_tag_2>", "<relevant_tag_3>"],
    "date": "<date of the article in YYYY-MM-DD format>",
    "image": "<image URL if available, otherwise omit it>"
  }
]

Instructions:
- \`story_summary\` must be **concise yet complete**, similar to a news digest (8-9 lines max). Focus on key details: what happened, who was involved, when, where, and why it matters.
- \`tags\` must be lowercase, no spaces or special characters. Use only relevant keywords (e.g., "cricket", "odi", "ipl", "t20", "bcci", "worldcup"). Do not exceed 3 tags.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

const fetchMeta = async (url) => {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  const articles = [];

  $(".cb-col.cb-col-100.cb-lst-itm.cb-pos-rel.cb-lst-itm-lg").each((_, el) => {
    const title = $(el).find("h2 a").text().trim();
    const link = $(el).find("h2 a").attr("href")?.trim();
    const image = $(el).find("img").attr("src")?.trim();
    const dateText = $(el).find("span.cb-nws-time").text().trim();

    const pubDate = new Date();
    const match = dateText.match(/(\d+)(?:m ago|h ago|s ago)/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (dateText.includes("m ago")) pubDate.setMinutes(pubDate.getMinutes() - val);
      else if (dateText.includes("h ago")) pubDate.setHours(pubDate.getHours() - val);
      else pubDate.setSeconds(pubDate.getSeconds() - val);
    }

    if (title && link && match) {
      articles.push({
        title,
        link: `https://www.cricbuzz.com${link}`,
        image,
        date: pubDate.toISOString().split("T")[0],
        pubDate,
      });
    }
  });

  const seen = new Set();
  const unique = articles.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });

  unique.sort((a, b) => b.pubDate - a.pubDate);

  const now = new Date();
  const recent = unique.filter(({ pubDate }) => (now - pubDate) / (1000 * 60 * 60 * 24) <= 2);

  return recent.length >= 10 ? recent : unique.slice(0, 10);
};

const fetchContent = async (url) => {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const paras = [];
    $(".cb-nws-dtl-itms p").each((_, el) => {
      const t = $(el).text().trim();
      if (t) paras.push(t);
    });
    return paras.join(" ");
  } catch (e) {
    console.error("❌ Failed to extract content from:", url, e.message);
    return null;
  }
};

const getCricket = async () => {
  const metas = await fetchMeta(cricket_article_url);
  const results = await Promise.allSettled(
    metas.map(async (a) => {
      const content = await fetchContent(a.link);
      if (!content) return null;
      return {
        title: a.title,
        link: a.link,
        date: a.pubDate.toISOString().split("T")[0],
        image: a.image,
        content,
      };
    })
  );

  const prepared = results.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);

  if (prepared.length === 0) {
    console.error("⚠️ No articles to process.");
    return;
  }

  const maxRetries = 4;
  let attempt = 0;
  let output = "";
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      const aiRes = await aiAgent(prepared, prompt);
      output = aiRes.replace(/```json|```/g, "").trim();
      const data = JSON.parse(output);
      return data;
    } catch (err) {
      attempt++;
      lastError = err;
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) console.log("🔄 Retrying...");
      else{
        throw new Error(`Failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
  return [];
};

// const data= await getCricket();
// console.log(data);

export { getCricket };
