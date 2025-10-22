import { astrology_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";

const signs = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const prompt = `
  You are given a list of horoscope articles. For each article, extract and return a structured JSON object in the following format **without any extra text, markdown, or backticks**:
  
  {
    "<zodiac_sign>": {
      "title": "<title of the article>",
      "link": "<URL of the article>",
      "story_summary": "<concise 6-7 line summary of the article>",
      "tags": ["<zodiac_sign>", "horoscope", "astrology"],
      "date": "<date of the article> that can be inferred from the article in YYYY-MM-DD format>",
    }
  }
  
  Instructions:
  - Use only one zodiac sign per object key from this enum: ${JSON.stringify(signs)}.
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
 
const getList = async (url) => {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const data = [];
    $(".cartHolder.listView.track.timeAgo").each((_, el) => {
      const title = $(el).attr("data-vars-story-title");
      const link = $(el).attr("data-weburl");
      if (title && link) data.push({ title, link });
    });
    return data.slice(0, 13);
  } catch (err) {
    console.error("Failed to fetch articles:", err.message);
    return [];
  }
};

const getText = async (url) => {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const text = [];
    $("#storyMainDiv p").each((_, el) => {
      text.push($(el).text());
    });
    return text.join(" ");
  } catch (err) {
    console.error("Failed to extract content from:", url, err.message);
    return "";
  }
};

const getAstro = async () => {
  const list = await getList(astrology_url);
  const tasks = list.map(async (art) => {
    const content = await getText(art.link);
    return { title: art.title, link: art.link, content };
  });
  const results = await Promise.allSettled(tasks);
  const articles = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  const maxTries = 4;
  let tries = 0;
  let output = "";
  while (tries < maxTries) {
    try {
      output = await aiAgent(articles, prompt);
      output = output.replace(/```json|```/g, "").trim();
      let jsonData = JSON.parse(output);
      jsonData = Object.fromEntries(
        Object.entries(jsonData).map(([key, val]) => [key.toLowerCase(), val])
      );
      return jsonData;
    } catch (err) {
      tries++;
      if (tries >= maxTries) throw new Error("AI processing failed: " + err.message);
    }
  }
  return [];
};
export {getAstro};
