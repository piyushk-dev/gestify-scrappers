import { tech_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";

const prompt = `
You are given a list of tech news articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

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
- Keep \`tags\` lowercase, with no spaces or special characters. Use only relevant keywords (e.g., "technology", "ai", "startups", "gadgets", "software", "innovation"). Do not exceed 3 tags.
- Only include the \`image\` field if a valid image URL is available.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

// Extracts articles from the given URL
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const articles = [];
  $(".caption_box").each((_, el) => {
    const link = $(el).find("a").attr("href");
    const title = $(el).find(".news_listing").text().trim();
    const dateText = $(el).find(".dateline").text().trim();
    const dateMatch = dateText.match(/(\d{1,2} \w+ \d{4})/);
    const date = dateMatch ? new Date(dateMatch[1]) : null;
    const image = $(el).find("img").attr("src");
    const category = $(el).find(".catname").text().trim();
    if (link && title && date) {
      articles.push({
        title,
        link,
        pubDate: date,
        image: image || null,
        category,
      });
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
  return uniqueArticles.slice(0, 10);
};

// Extracts main content from the article's page
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];
    $("div.content_text.row.description").each((_, el) => {
      $(el)
        .find("p, h2")
        .each((_, paragraph) => {
          const text = $(paragraph).text().trim();
          if (text) {
            paragraphs.push(text);
          }
        });
    });

    return paragraphs.join(" ");
  } catch (err) {
    console.error("❌ Failed to extract content from:", url, err.message);
    return null;
  }
};

const getTech = async () => {
  const articlesMeta = await getUrlsAndHeading(tech_url);
  const results = await Promise.allSettled(
    articlesMeta.map(async (article) => {
      const content = await getContent(article.link);
      if (!content) {
        console.error("❌ Failed to extract content from:", article.link);
      }
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
// const tech_articles = await getTech();
// console.log(tech_articles);
export { getTech };
