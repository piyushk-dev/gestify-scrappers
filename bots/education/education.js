import { education_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";
import fs from "fs/promises";
import { get } from "http";

const prompt = `
You are given a list of education news articles. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

[
  {
    "title": "<title of the article>",
    "link": "<URL of the article>",
    "story_summary": "<concise 8-9 line summary of the article>",
    "tags": ["<relevant_tag_1>", "<relevant_tag_2>", "<relevant_tag_3>"],
    "date": "<date of the article in YYYY-MM-DD format that can be inferred from the article or 'NA' if not available>",
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

/*

<div class="cartHolder listView noAd">
<a href="/education/exam-results/tnpsc-group-4-result-2025-declared-at-tnpsc-gov-in-check-marks-and-rank-position-here-101761133026340.html" class="storyLink"></a>
<h3 class="hdg3"><a href="/education/exam-results/tnpsc-group-4-result-2025-declared-at-tnpsc-gov-in-check-marks-and-rank-position-here-101761133026340.html">TNPSC Group 4 Result 2025 declared, check marks and rank position here</a></h3>
<figure><span><a href="https://www.hindustantimes.com/education/exam-results/tnpsc-group-4-result-2025-declared-at-tnpsc-gov-in-check-marks-and-rank-position-here-101761133026340.html"><img src="https://www.hindustantimes.com/ht-img/img/2025/10/22/148x111/TNPSC_Group_4_1761133129409_1761133136681.png" alt="TNPSC Group 4 Result 2025 declared at tnpsc.gov.in, check marks and rank position here"></a></span></figure>
<div class="storyShortDetail">
<div class="actionDiv flexElm">
<div class="secName ftlsecName"><a href="https://www.hindustantimes.com/education/exam-results">exam results</a></div>
</div>
</div>
</div>

*/
const articles = [];
$(".cartHolder.listView.noAd").each((_, element) => {
  const $element = $(element);
  const title = $element.find("h3.hdg3 a").text().trim();
  const itemlink = $element.find("h3.hdg3 a").attr("href");
  const image = $element.find("figure img").attr("src");
  const date = $element.find(".storyShortDetail .date, .dateTime, time").text().trim();

  // console.log({ title, itemlink, image, date });


  if (title && itemlink && image) { const link = `https://www.hindustantimes.com${itemlink}`;
    
    // Parse date if it exists
    let pubDate = new Date(0);
    if (date) {
      const match = date.match(/(Updated on|Published on) (.+?) IST/);
      pubDate = match ? new Date(match[2]) : new Date(date);
    }
    
    articles.push({ title, link, date: date || '', image, pubDate });
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

const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const container = $("#dataHolder"); // generic top-level container
    const paragraphs = [];

    // Extract the main title <h1>
    const title = container.find("h1").first().text().trim();
    if (title) paragraphs.push(title + "\n");

    // Extract <h2> and <p> inside the container
    container.find("h2, p").each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        paragraphs.push(text);
      }
    });

    return paragraphs.join("\n\n"); // double newline for readability
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

//printing on the terminal for testing purpose
// getEdu().then((data) => console.log(data)).catch((err) => console.error(err));
