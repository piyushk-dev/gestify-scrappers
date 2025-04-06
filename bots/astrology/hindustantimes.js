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
      "image": "<optional image URL of the zodiac constellation (omit this field if not available)>"
    }
  }
  
  Instructions:
  - Use only one zodiac sign per object key from this enum: ${JSON.stringify(zodiacSigns)}.
  - The \`story_summary\` must be **concise yet complete**, similar to a news digest (6-7 lines max). Avoid fluff or repetition.
  - Ensure the \`tags\` are lowercase, max 3, no spaces or special characters.
  - Do not add unrelated tags.
  - If a zodiac image is present, include it in the \`image\` field. If not, exclude the field entirely.
  - Return only valid **minified JSON** — no backticks, no markdown, no prose before or after.
  
  Example Output:
  {
    "aries": {
      "title": "Aries Horoscope Today, October 23, 2023: You will be in a good mood today",
      "link": "https://www.hindustantimes.com/astrology/aries-horoscope-today-october-23-2023-you-will-be-in-a-good-mood-today-101699195153679.html",
      "story_summary": "Today, Aries natives may feel a surge of positivity and motivation...",
      "tags": ["aries", "horoscope", "astrology"],
      "image": "https://example.com/zodiac/aries.png"
    }
  }
  `;

  /**
   * @todo add image URL (static URL) of the zodiac constellation
   * @todo add date of the article
  */

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
  const preparedArticles = [];

  for (let i = 0; i < urls.length; i++) {
    const content = await getContent(urls[i].link);
    
    preparedArticles.push({
      title: urls[i].title,
      link: urls[i].link,
      content: content
    });
  }

  try {
    const raw = await aiAgent(preparedArticles, prompt);

    // console.log("AI response:", raw);


    const cleaned = raw.replace(/```json|```/g, "").trim();

    try {
      const json = JSON.parse(cleaned);
      await fs.writeFile("test.json", JSON.stringify(json, null, 2)); //will be later replace with writing to DB
      console.log("✅ Horoscope data saved to test.json"); 
    } catch (parseError) {
      console.error("❌ Invalid JSON from AI:", parseError.message);
      await fs.writeFile("invalid-output.txt", cleaned);
      console.log("⚠️ Raw AI output saved to invalid-output.txt for debugging.");
    }
  } catch (err) {
    console.error("❌ Failed to summarize using AI:", err.message);
  }
};

/**
 * Wrapper to call getAstrology()
 */
const helperFun = async () => {
  await getAstrology();
};

helperFun();
