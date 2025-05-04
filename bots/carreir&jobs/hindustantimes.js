import { jobs_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";
import fs from "fs/promises";

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
- Keep \`tags\` lowercase, with no spaces or special characters. Use only relevant keywords (e.g., "jobs", "recruitment", "government", "hiring", "vacancy"). Do not exceed 3 tags.
- Only include the \`image\` field if a valid image URL is available.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

// Extracts articles from the given URL
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  /*
 
<div class="cartHolder listView track timeAgo" data-vars-cardtype="" data-vars-storyid="101743859153214" data-vars-storytype="story" data-weburl="https://www.hindustantimes.com/education/employment-news/secr-apprentice-recruitment-2025-apply-for-1007-posts-at-apprenticeshipindia-gov-in-details-here-101743859153214.html" data-vars-story-url="/education/employment-news/secr-apprentice-recruitment-2025-apply-for-1007-posts-at-apprenticeshipindia-gov-in-details-here-101743859153214.html" data-vars-story-title="SECR Apprentice Recruitment 2025: Apply for 1007 posts, check details here" data-vars-story-time="5 Apr, 2025 6:51:19 PM" data-vars-section="Employment News" data-vars-mainsection="education" data-vars-orderid="4">

<h3 class="hdg3"><a href="/education/employment-news/secr-apprentice-recruitment-2025-apply-for-1007-posts-at-apprenticeshipindia-gov-in-details-here-101743859153214.html" data-articleid="101743859153214">SECR Apprentice Recruitment 2025: Apply for 1007 posts, check details here</a></h3>
<h2 class="sortDec">SECR has invited applications for Apprentice posts. Eligible candidates can apply for 1007 posts at apprenticeshipindia.gov.in.&nbsp;</h2>
<figure>
<span>
<a href="/education/employment-news/secr-apprentice-recruitment-2025-apply-for-1007-posts-at-apprenticeshipindia-gov-in-details-here-101743859153214.html" data-articleid="101743859153214">
<img src="https://www.hindustantimes.com/ht-img/img/2025/04/05/148x111/Screenshot_2023-03-03_162321_1677840778655_1743859241052.png" class="lazy" data-src="https://www.hindustantimes.com/ht-img/img/2025/04/05/148x111/Screenshot_2023-03-03_162321_1677840778655_1743859241052.png" title="SECR Apprentice Recruitment 2025: Apply for 1007 posts, check details here (Representative image)" alt="SECR Apprentice Recruitment 2025: Apply for 1007 posts, check details here (Representative image)" data-loaded="true">
</a></span>
</figure>
<div class="storyShortDetail">
<div class="actionDiv flexElm" id="actionDivFTLBig-101743859153214">
<div class="dateTime secTime ftldateTime ">Published 1 day ago</div>
</div>
<div class="actionDiv" style="display:none">
<div id="new_socialIcons_inLineStory-101743859153214" class="new__socialIcons"></div>
</div>
<div class="stroyPub">
<div class="storyBy">
<span class="authorBy">By</span><small class="byLineAuthor"><a href="/author/ht-education-desk-101650005388976" class="authorNameClick" data-vars-article-title="SECR Apprentice Recruitment 2025: Apply for 1007 posts at apprenticeshipindia.gov.in, details here" data-vars-cta-text="HT Education Desk" data-vars-article-id="101743859153214" data-vars-article-category="education" data-vars-published-date="Apr 05, 2025 06:51 PM IST">HT Education Desk</a></small> | Edited by <small class="byLineAuthor"><a href="/author/papri-chanda-101616241421972" class="authorNameClick" data-vars-article-title="SECR Apprentice Recruitment 2025: Apply for 1007 posts at apprenticeshipindia.gov.in, details here" data-vars-cta-text="HT Education Desk" data-vars-article-id="101743859153214" data-vars-article-category="education" data-vars-published-date="Apr 05, 2025 06:51 PM IST">Papri Chanda</a></small>
</div>
</div>
</div>
</div>

 */
  const articles = [];
  $(".cartHolder.listView.track.timeAgo").each((_, element) => {
    const title = $(element).find("h3 a").text();
    const itemlink = $(element).find("h3 a").attr("href");
    const date = $(element).find(".dateTime.secTime.ftldateTime").text();
    const image = $(element).find("figure img").attr("src");
    if (title && itemlink && date && image) {
      const match = date.trim().match(/(Updated on|Published on) (.+?) IST/);
      const link = `https://www.hindustantimes.com${itemlink}`;
      const pubDate = match ? new Date(match[2]) : new Date(0);
      articles.push({ title, link, date, image, pubDate });
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
  const recent = uniqueArticles.filter(({ pubDate }) => {
    const diffDays = (now - pubDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  });
  return recent.length >= 10 ? recent : uniqueArticles.slice(0, 10);
};

// Extracts main content from the article's page
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];

    $("#storyMainDiv p").each((_, el) => {
      const text = $(el).text().trim();
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

const getCleanedArticles = async () => {
  const articlesMeta = await getUrlsAndHeading(jobs_url);
  console.log(articlesMeta);
  console.log(articlesMeta.length);
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
      await fs.writeFile("test.json", JSON.stringify(jsonData, null, 2));
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
getCleanedArticles();
