import { astrology_url } from "../URLs/Links.js";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";

const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  //   await fs.writeFile("test.html", html); //for testing
  const $ = cheerio.load(html);
  const data = [];
  $(".cartHolder.listView.track.timeAgo").each((index, element) => {
    const title = $(element).attr("data-vars-story-title");
    const link = $(element).attr("data-weburl");
    data.push({ title, link });
  });
  return data;
};

const lenght = 100;

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
- Use only one zodiac sign per object key from this enum: ${JSON.stringify(
  zodiacSigns
)}.
- The \`story_summary\` must be **concise yet complete**, similar to a news digest (6–7 lines max). Avoid fluff or repetition.
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

/**object structure
 * [
 * {
 *  title: "Aries Horoscope Today, October 23, 2023: You will be in a good mood today",
 *  link: "https://www.hindustantimes.com/astrology/aries-horoscope-today-october-23-2023-you-will-be-in-a-good-mood-today-101699195153679.html",
 *  story_summary:"<from function>"
 *  tags: ["Aries", "Horoscope", "Astrology"]<-- from function -->>
 *  image?:"optional imge<constelation image>"
 * }
 * ]
 */

const getContent = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  //**
  // divid=storyMainDiv, get all the text inside  this div's p tags
  //
  //
  //
  //
  //
  //  */
  const story_summary = [];
  $("#storyMainDiv p").each((index, element) => {
    const text = $(element).text();
    story_summary.push(text);
  });
  const story_summary_string = story_summary.join(" ");
  return story_summary_string;
};

const getAstrology = async () => {
  const urls = await getUrlsAndHeading(astrology_url);
  const finalArticles = [];
  const tempConst = [];
  for (let i = 0; i < urls.length; i++) {
    const content = await getContent(urls[i].link);
    tempConst.push({
      title: urls[i].title,
      link: urls[i].link,
      content: content,
      // story_summary: AI_Response.story_summary,
      // tags: AI_Response.tags,
      // image: AI_Response.image,
    });
  }
  const raw = await aiAgent(tempConst, prompt);
  const cleaned = raw.replace(/```json|```/g, "").trim();
  fs.writeFile("test.json", cleaned); // will be removed later with writing to db
};
