import { trending_url } from "../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../Agent/index.js";
import fs from "fs/promises";

const prompt = `
You are given a list of trending news articles from a general news page. For each article, extract and return a structured JSON object in the following array format **without any extra text, markdown, or backticks**:

[
  {
    "title": "<title of the article>",
    "link": "<URL of the article>",
    "story_summary": "<concise 8-9 line summary of the article>",
    "tags": ["<relevant_tag_1>", "<relevant_tag_2>", "<relevant_tag_3>"],
    "date": "<date of the article in YYYY-MM-DD format>",
    "sentiment": "<positive|negative|neutral>
    "image": "<image URL if available, otherwise omit it>"
  }
]

Instructions:
- \`story_summary\` must be **concise yet complete**, similar to a news digest (8-9 lines max). Focus on key details: what happened, who was involved, when, where, and why it matters.
- \`tags\` must be lowercase, no spaces or special characters. Use only relevant keywords (e.g., "politics", "sports", "technology", "entertainment", "business", "health", "world"). Do not exceed 3 tags.
- Return only a **valid minified JSON array** — no markdown, no backticks, no extra explanation.
`;

// Extracts metadata (title, link, date, image) from articles on Chess.com
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const data = await response.json();
  //   console.log(data);
  //x.items[0].headline x.items[0].storyURL x.items[0].publishDate x.items[0].keywords x.items[0].imageObject.original
  const articles = data.items.map((item) => ({
    title: item.headline,
    link: item.storyURL,
    pubDate: new Date(item.publishDate),
    image: item.imageObject?.original || null,
  }));
  const seen = new Set();
  const uniqueArticles = articles.filter(({ link }) => {
    if (seen.has(link)) return false;
    seen.add(link);
    return true;
  });
  uniqueArticles.sort((a, b) => b.pubDate - a.pubDate);
  const now = new Date();
  const recent = uniqueArticles.filter(({ pubDate }) => {
    const diffDays = (now - pubDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 2;
  });

  return uniqueArticles.slice(0, 15);
};

// Extracts full article content
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];
    $(".storyParagraph").each((_, element) => {
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
const getCleanedArticles = async () => {
  const articlesMeta = await getUrlsAndHeading(trending_url);
  const results = await Promise.allSettled(
    articlesMeta.map(async (article) => {
      const content = await getContent(article.link);
      if (!content) return null;
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

getCleanedArticles()

/*


<div class="storyPage_storyContent__m_MYl"><div id="article-index-0" class="storyParagraph"><p><strong>Small-cap Multibagger stock:</strong> Rathi Steel &amp; Power announced on Saturday, April 5, that the iron and steel product maker had started the production of TMT Bars at their <a href="https://www.livemint.com/news/india/delhi-airport-operator-gmr-sues-government-for-allowing-commercial-flights-from-ghaziabad-airbase-11742200621290.html" target="_blank">Ghaziabad</a> factory, according to an exchange filing. </p></div><div id="article-index-1" class="storyPage_alsoRead__6h9uq"><strong>Also Read<!-- --></strong> <!-- -->|<!-- --> <!-- --><a href="/market/stock-market-news/multibagger-sme-stock-defies-trumps-tariffs-rises-300-against-ipo-price-in-three-months-11743844503326.html">Multibagger IPO: SME stock rises 300% against issue price in three months</a></div><div id="article-index-2" class="storyParagraph"><p>“We wish to inform that the commercial operations of TMT Rolling Mill Division(for production of TMT Bars) of the Company set up at A-3, South of G T Road, Industrial Area, Ghaziabad, has recommenced today, i.e., April 5, 2025,” said the company in the BSE filing on Saturday.</p></div><div id="article-index-3" class="storyParagraph"><p>Earlier this year, on March 22, the company announced that its promoter, PCR Holdings, formerly known as Archit Securities, had acquired an additional <a href="https://www.livemint.com/market/stock-market-news/mazagon-dock-shipbuilders-share-price-in-focus-as-government-to-sell-4-8-stake-in-defence-psu-via-ofs-11743733711177.html" target="_blank">stake</a> in the company.</p></div><div id="article-index-4" class="storyPage_alsoRead__6h9uq"><strong>Also Read<!-- --></strong> <!-- -->|<!-- --> <!-- --><a href="/market/stock-market-news/can-indian-stock-market-crash-further-heres-how-to-trade-next-week-11743930708392.html">Can Indian stock market crash further? Here’s how to trade next week</a></div><div id="article-index-5" class="storyParagraph"><p>PCR Holdings increased its stake by 0.21 per cent through the purchase of 45,000 equity shares worth  <span class="webrupee">₹</span>85,06,30,030 or  <span class="webrupee">₹</span>85.06 crore from an open market operation.</p></div><div id="article-index-6" class="storyParagraph"><p>As per <i>Mint's</i> earlier report, the ownership structure of <a href="https://www.livemint.com/market/market-stats/stocks-rathi-steel-power-share-price-nse-bse-S0002078" target="_blank">Rathi Steel and Power</a> was 40.32 per cent with promoters, 8.94 per cent with the Foreign Institutional Investors (<a href="https://www.livemint.com/topic/fiis" target="_blank">FIIs</a>), while the Domestic Institutional Investors (DIIs) hold 2.53 per cent stake in the company.</p></div><div id="article-index-7" class="storyParagraph"><h2>Rathi Steel &amp; Power Share Price</h2><p>Rathi Steel &amp; Power shares closed 0.32 per cent lower at  <span class="webrupee">₹</span>31.03 after Friday's stock market session, compared to  <span class="webrupee">₹</span>31.13 at the previous market close. The company announced the capex update move on Saturday, April 5.</p></div><div id="article-index-8" class="storyPage_alsoRead__6h9uq"><strong>Also Read<!-- --></strong> <!-- -->|<!-- --> <!-- --><a href="/market/stock-market-news/stock-to-watch-650-rally-in-two-years-multibagger-stock-will-be-in-focus-on-monday-heres-why-11742717082802.html">650% rally in two years! THIS Multibagger stock will be in focus on Monday</a></div><div id="article-index-9" class="storyParagraph"><p>The iron and steel product maker's shares hit their 52-week high levels at  <span class="webrupee">₹</span>97.81 on July 30, 2024, while the 52-week low level was at  <span class="webrupee">₹</span>24.50 on March 3, 2025, according to BSE data. As of Friday's market close the shares are trading slightly above the year-low levels.</p></div><div id="article-index-10" class="storyParagraph"><p>Rathi Steel and Power shares have given stock market investors more than 675 per cent returns in the last five years. However, the stock has lost a little over 51 per cent in the last one-year period. The shares have gained 4.8 per cent in the last one-month period in 2025.</p></div><div id="article-index-11" class="storyParagraph"><p>The <a href="https://www.livemint.com/topic/multibagger-stock" target="_blank">multibagger stock</a>'s market capitalisation was at  <span class="webrupee">₹</span>263.95 crore as of the stock market close on Friday, April 4.</p></div><div id="article-index-12" class="storyParagraph"><p><i><strong>Disclaimer:</strong> The views and recommendations made above are those of individual analysts or broking companies, and not of Mint. We advise investors to check with certified experts before making any investment decisions.</i></p></div></div>







*/
