import { astrology_url } from "../URLs/Links.js";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";

const zodiacSigns = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const prompt = `
  You are given a list of horoscope articles. For each article, extract and return a structured JSON object in the following format **without any extra text, markdown, or backticks**:
  
  {
    "<zodiac_sign>": {
      "title": "<title of the article>",
      "link": "<URL of the article>",
      "story_summary": "<concise 6-7 line summary of the article>",
      "tags": ["<zodiac_sign>", "horoscope", "astrology"],
      "date": "<date of the article>",
    }
  }
  
  Instructions:
  - Use only one zodiac sign per object key from this enum: ${JSON.stringify(
    zodiacSigns
  )}.
  - The \`story_summary\` must be **concise yet complete**, similar to a news digest (6-7 lines max). Avoid fluff or repetition.
  - Ensure the \`tags\` are lowercase, max 3, no spaces or special characters.
  - Do not add unrelated tags.
  - Return only valid **minified JSON** — no backticks, no markdown, no prose before or after.
  - Date should be in the format YYYY-MM-DD.
  
  Example Output:
  {
    "aries": {
      "title": "Aries Horoscope Today, October 23, 2023: You will be in a good mood today",
      "link": "https://www.hindustantimes.com/astrology/aries-horoscope-today-october-23-2023-you-will-be-in-a-good-mood-today-101699195153679.html",
      "story_summary": "Today, Aries natives may feel a surge of positivity and motivation...",
      "tags": ["aries", "horoscope", "astrology"],
      "date": "2023-10-23"
    }
  }
`;

/**
 * Fetches all horoscope article URLs and titles from the main listing page
 * @param {string} url - Source URL containing horoscope links
 * @returns {Promise<Array<{title: string, link: string}>>}
 */
const getUrlsAndHeading = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const data = [];

    $(".cartHolder.listView.track.timeAgo").each((index, element) => {
      const title = $(element).attr("data-vars-story-title");
      const link = $(element).attr("data-weburl");
      if (title && link) data.push({ title, link });
    });

    return data;
  } catch (err) {
    console.error("❌ Failed to fetch article list:", err.message);
    return [];
  }
};

/**
 * Scrapes content text from a horoscope article
 * @param {string} url - Article URL
 * @returns {Promise<string>} - Combined paragraph text from the article
 */
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const story_summary = [];

    $("#storyMainDiv p").each((index, element) => {
      story_summary.push($(element).text());
    });

    return story_summary.join(" ");
  } catch (err) {
    console.error("❌ Failed to extract content from:", url, err.message);
    return "";
  }
};

/**
 * Main logic to fetch, extract, summarize, and save horoscope data
 */
const getAstrology = async () => {
  const urls = await getUrlsAndHeading(astrology_url);
  const promises = urls.map(async (article) => {
    const content = await getContent(article.link);
    return {
      title: article.title,
      link: article.link,
      content: content,
    };
  });

  const results = await Promise.allSettled(promises);
  const preparedArticles = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  const maxRetries = 3;
  let attempt = 0;
  let success = false;
  let cleanedOutput = "";
  let lastError = null;

  while (attempt < maxRetries && !success) {
    try {
      const aiResponse = await aiAgent(preparedArticles, prompt);
      cleanedOutput = aiResponse.replace(/```json|```/g, "").trim();
      const jsonData = JSON.parse(cleanedOutput);
      const formattedData = Object.fromEntries(
        Object.entries(jsonData).map(([key, value]) => [key.toLowerCase(), value])
      );
      await fs.writeFile("test.json", JSON.stringify(formattedData, null, 2));
      console.log("✅ Article data saved to test.json");
      success = true;
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

/**
 * Wrapper to call getAstrology()
 */
const helperFun = async () => {
  await getAstrology();
};

helperFun();
