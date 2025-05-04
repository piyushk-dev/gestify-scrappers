import { cricket_article_url } from "../../URLs/Links.js";
import * as cheerio from "cheerio";
import { aiAgent } from "../../../Agent/index.js";
import fs from "fs/promises";

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


// Extracts metadata (title, link, date, image) from articles on Chess.com
const getUrlsAndHeading = async (url) => {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const articles = [];

    $(".cb-col.cb-col-100.cb-lst-itm.cb-pos-rel.cb-lst-itm-lg").each((_, el) => {
    const title = $(el).find("h2 a").text().trim();
    const link = $(el).find("h2 a").attr("href")?.trim();
    const image = $(el).find("img").attr("src")?.trim();
        //dateText is inside <span class="cb-nws-time">57m ago</span> the span, grab the span first then get the text
    const dateText = $(el).find("span.cb-nws-time").text().trim();
    const pubDate = new Date();
    const match = dateText.match(/(\d+)(?:m ago|h ago|s ago)/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = dateText.includes("m ago") ? "minutes" : dateText.includes("h ago") ? "hours" : "seconds";
      pubDate.setMinutes(pubDate.getMinutes() - value);
    }
    if (title && link && match) {
        const fullLink = `https://www.cricbuzz.com${link}`;
        articles.push({
        title,
        link: fullLink,
        image,
        date: pubDate.toISOString().split("T")[0],
        pubDate,
        });
    }
    });
    console.log(articles);
  // Remove duplicates based on the link
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

// Extracts full article content
const getContent = async (url) => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const paragraphs = [];
    $(".cb-nws-dtl-itms p").each((_, el) => {
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
  const articlesMeta = await getUrlsAndHeading(cricket_article_url);
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

getCleanedArticles();

/**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
<div class="cb-col cb-col-100 cb-lst-itm cb-pos-rel cb-lst-itm-lg"><div class="cb-col cb-col-33 cb-pos-rel" itemscope="" itemtype="https://schema.org/ImageObject" itemprop="image"><meta itemprop="width" content="205"> <meta itemprop="height" content="152"> <meta itemprop="url" content="https://static.cricbuzz.com/a/img/v1/205x152/i1/c647918/kl-rahul-opened-up-in-a-chat-w.jpg"><a target="_self" href="/cricket-news/133969/ive-realised-t20-cricket-is-all-about-hitting-boundaries-kl-rahul" title="I've realised T20 cricket is all about hitting boundaries - KL Rahul"><img height="152" width="205" alt="KL Rahul opened up in a chat with Kevin Pietersen" title="KL Rahul opened up in a chat with Kevin Pietersen" itemprop="image" class="cb-lst-img" src="https://static.cricbuzz.com/a/img/v1/205x152/i1/c647918/kl-rahul-opened-up-in-a-chat-w.jpg" style="padding:0px;"></a></div><div class="cb-col-67 cb-nws-lst-rt cb-col cb-col-text-container"><div class="cb-nws-time"><a target="_self" class="cb-text-link" href="/cricket-news/latest-news" title="NEWS">NEWS</a><span class="cb-dot">&nbsp;•&nbsp;</span>IPL 2025</div><h2 class="cb-nws-hdln cb-font-18 line-ht24"><a target="_self" class="cb-nws-hdln-ancr text-hvr-underline" href="/cricket-news/133969/ive-realised-t20-cricket-is-all-about-hitting-boundaries-kl-rahul" title="I've realised T20 cricket is all about hitting boundaries - KL Rahul">I've realised T20 cricket is all about hitting boundaries - KL Rahul</a></h2><div class="cb-nws-intr">The wicketkeeper-batter opens up about how he went about changing his mindset and approach in T20 cricket</div><div><span class="cb-nws-time">57m ago</span></div></div></div>
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

/**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 <article itemscope="" itemtype="http://schema.org/article"> <meta itemprop="mainEntityOfPage" content="https://www.cricbuzz.com/cricket-news/133969/ive-realised-t20-cricket-is-all-about-hitting-boundaries-kl-rahul"> <div class="cb-nws-sub-txt"> <span class="cb-text-gray">IPL 2025</span> </div> <h1 class="nws-dtl-hdln" itemprop="headline"> I've realised T20 cricket is all about hitting boundaries - KL Rahul </h1> <div class="cb-nws-sub-txt"> <span class="cb-news-sub-text">by&nbsp;</span> <a class="cb-text-link" href="/cricket-news/author/cricbuzz-staff/1" title="click here to view the editorials by Cricbuzz Staff"> <span itemprop="author" itemscope="" itemtype="http://schema.org/Person"> <span itemprop="name"> Cricbuzz Staff </span> </span> </a> <span class="cb-dot">&nbsp;•&nbsp;</span> <time itemprop="datePublished" datetime="Apr 06 Sun 2025 UTC 01:04:05 0"></time> <time itemprop="dateModified" datetime="Apr 06 Sun 2025 UTC 01:04:09 0"></time> <span>Last updated on</span> <span ng-bind="1743947529708|date: 'EEE, MMM d, y, hh:mm a'"></span> </div> <section class="cb-nws-dtl-itms cb-col cb-col-100"> <div class="pull-left"> <table class="cb-social"><tbody><tr><td class="cb-social-td"><a target="_blank" title="Share on Facebook" href="https://www.facebook.com/sharer.php?u=https://www.cricbuzz.com/cricket-news/133969/ive-realised-t20-cricket-is-all-about-hitting-boundaries-kl-rahul&amp;text=I've realised T20 cricket is all about hitting boundaries - KL Rahul" class="cb-social-ancr cb-social-ancr-fb"><span class="cb-ico cb-fb-share "></span><span class="cb-font-12">Share</span></a></td><td class="cb-social-td"><a target="_blank" title="Share on Twitter" href="https://twitter.com/intent/tweet?url=https://www.cricbuzz.com/cricket-news/133969/ive-realised-t20-cricket-is-all-about-hitting-boundaries-kl-rahul&amp;text=I've realised T20 cricket is all about hitting boundaries - KL Rahul&amp;via=cricbuzz" class="cb-social-ancr cb-social-ancr-twt"><span class="cb-ico cb-twt-share"></span><span class="cb-font-12">Tweet</span></a></td></tr></tbody></table> </div> </section> <section> <section class="cb-news-img-section horizontal-img-container" itemscope="" itemtype="http://schema.org/ImageObject" itemprop="image"> <meta itemprop="width" content="595"> <meta itemprop="height" content="396"> <meta itemprop="url" content="/a/img/v1/595x396/i1/c647918/kl-rahul-opened-up-in-a-chat-w.jpg"> <img class="cursor-pointer" height="396" width="595" alt="KL Rahul opened up in a chat with Kevin Pietersen" title="KL Rahul opened up in a chat with Kevin Pietersen" src="/a/img/v1/595x396/i1/c647918/kl-rahul-opened-up-in-a-chat-w.jpg" itemprop="contentUrl"> <div class="cb-img-cptn">KL Rahul opened up in a chat with Kevin Pietersen © Sportzpics</div> </section> </section> <section class="cb-nws-dtl-itms" itemprop="articleBody"> <p class="cb-nws-para"> It was back in 2018, seven seasons ago, when KL Rahul had a strike-rate over 150 in the IPL. This was despite the wicketkeeper-batter scoring over 500 runs each season in the tournament since that year - except 2022 when he played only nine games as his season was cut short due to a hamstring injury. He also endured the pressures of captaincy with Lucknow Super Giants and Punjab Kings during these years. </p> </section>  <section class="cb-nws-dtl-itms" itemprop="articleBody"> <p class="cb-nws-para"> However, this season and without the pressures of captaincy, the INR 14-crores acquisition of Delhi Capitals appears to be a freed man. Having missed the first game due to paternity leave, he finished off the team's chase quickly with 15 (5) against the Sunrisers Hyderabad with two boundaries and a six. The Indian wicketkeeper-batter has already amassed 92 runs so far this tournament at a strike-rate of 164.29, and has just come off a match-winning 51-ball 77 in Chepauk. </p> </section>  <section class="cb-nws-dtl-itms" itemprop="articleBody"> <p class="cb-nws-para"> In an interview with IPLT20, with DC's mentor Kevin Pietersen, Rahul opened up about getting rid of the thought of taking the game deep and getting past the philosophy in which he had mentioned that 'strike-rate is overrated'. </p> </section>  <div class="cb-nws-dtl-itms"> <div id="native_mid_article" class="ad-native cb-ad-unit cb-nws-para"></div> </div> <section class="cb-nws-dtl-itms" itemprop="articleBody"> <p class="cb-nws-para"> "I think somewhere along the way I lost that fun of hitting boundaries and hitting sixes. I wanted to take the game deep, deep, deep and that somehow stuck in my head. But now I have realised I need to go back... cricket's changed, and T20 cricket, especially, is only about hitting boundaries. The team that hits more boundaries and sixes ends up winning the game." </p> </section>  <section class="cb-nws-dtl-itms" itemprop="articleBody"> <p class="cb-nws-para"> Rahul attributed credit to Indian assistant coach Abhishek Nayar whom he worked with for hours on end, and the batter stated that he found the love again for playing white-ball cricket. </p> </section>  <section class="cb-nws-dtl-itms" itemprop="articleBody"> <p class="cb-nws-para"> "I've worked really hard on my white-ball game the last year or so. Big shoutout to Abhishek Nayar. I've worked a lot with him ever since he's come into the Indian team," Rahul said. "We've spent hours and hours together talking about my white-ball game and how I can be better. We worked hours and hours together in Bombay and somewhere I have found the fun playing white-ball cricket." </p> </section>  <div class="cb-news-copyright"> © <span itemprop="publisher" itemscope="" itemtype="http://schema.org/Organization"><span itemprop="name">Cricbuzz</span></span> </div> <section class="cb-nws-dtl-itms"> <table class="cb-social"><tbody><tr><td class="cb-social-td"><a target="_blank" title="Share on Facebook" href="https://www.facebook.com/sharer.php?u=https://www.cricbuzz.com/cricket-news/133969/ive-realised-t20-cricket-is-all-about-hitting-boundaries-kl-rahul&amp;text=I've realised T20 cricket is all about hitting boundaries - KL Rahul" class="cb-social-ancr cb-social-ancr-fb"><span class="cb-ico cb-fb-share "></span><span class="cb-font-12">Share</span></a></td><td class="cb-social-td"><a target="_blank" title="Share on Twitter" href="https://twitter.com/intent/tweet?url=https://www.cricbuzz.com/cricket-news/133969/ive-realised-t20-cricket-is-all-about-hitting-boundaries-kl-rahul&amp;text=I've realised T20 cricket is all about hitting boundaries - KL Rahul&amp;via=cricbuzz" class="cb-social-ancr cb-social-ancr-twt"><span class="cb-ico cb-twt-share"></span><span class="cb-font-12">Tweet</span></a></td></tr></tbody></table> </section> <div class="cb-col cb-col-100" style="margin-bottom:20px; padding: 0px 5px!important;"> <div class="text-black cb-font-18 text-bold" style="margin-bottom:5px;">TAGS</div> <div class="cb-col cb-col-100"> <code class="label-tags cb-tags-dark text-white cb-font-12"> <a class="text-white" href="/cricket-series/9237/indian-premier-league-2025" title="Indian Premier League 2025"> Indian Premier League 2025 </a> </code> <code class="label-tags cb-tags-dark text-white cb-font-12"> <a class="text-white" href="/profiles/8733/kl-rahul" title="KL Rahul"> KL Rahul </a> </code> <code class="label-tags cb-tags-dark text-white cb-font-12"> <a class="text-white" href="/profiles/395/kevin-pietersen" title="Kevin Pietersen"> Kevin Pietersen </a> </code> <code class="label-tags cb-tags-dark text-white cb-font-12"> <a class="text-white" href="/cricket-team/delhi-capitals/61" title="Delhi Capitals"> Delhi Capitals </a> </code> </div> </div> <h3>RELATED STORIES</h3><div class="cb-col-100 cb-col" style="margin-bottom:20px;"><div class="cb-col cb-col-50" style="height: 75px; margin:5px 0px;"><a href="/cricket-news/133970/mi-aim-to-solve-powerplay-problems-rcb-aim-to-go-three-in-three-on-the-road" title="MI aim to solve PowerPlay problems; RCB aim to go three-in-three on the road "><div class="thumbnail"><div class="cb-col cb-col-33 cb-pos-rel" style="padding-left:2px!important; overflow:hidden;"><img class="img-responsive" title="mi-aim-to-solve-powerplay-problems-rcb-aim-to-go-three-in-three-on-the-road" alt="mi-aim-to-solve-powerplay-problems-rcb-aim-to-go-three-in-three-on-the-road" src="https://static.cricbuzz.com/a/img/v1/90x70/i1/c648193/mi-aim-to-solve-powerplay-prob.jpg"></div><div class="cb-col cb-col-67 txt-hvr-underline" style="height:auto">MI aim to solve PowerPlay problems; RCB aim to go three-in-three on the road </div></div></a></div><div class="cb-col cb-col-50" style="height: 75px; margin:5px 0px;"><a href="/cricket-news/133968/jasprit-bumrah-available-to-play-against-rcb" title="Jasprit Bumrah available to play against RCB"><div class="thumbnail"><div class="cb-col cb-col-33 cb-pos-rel" style="padding-left:2px!important; overflow:hidden;"><img class="img-responsive" title="jasprit-bumrah-available-to-play-against-rcb" alt="jasprit-bumrah-available-to-play-against-rcb" src="https://static.cricbuzz.com/a/img/v1/90x70/i1/c647867/jasprit-bumrah-available-to-pl.jpg"></div><div class="cb-col cb-col-67 txt-hvr-underline" style="height:auto">Jasprit Bumrah available to play against RCB</div></div></a></div><div class="cb-col cb-col-50" style="height: 75px; margin:5px 0px;"><a href="/cricket-news/133966/flexible-rahul-at-the-forefront-of-dcs-charge" title="Flexible Rahul at the forefront of DC's charge"><div class="thumbnail"><div class="cb-col cb-col-33 cb-pos-rel" style="padding-left:2px!important; overflow:hidden;"><img class="img-responsive" title="flexible-rahul-at-the-forefront-of-dcs-charge" alt="flexible-rahul-at-the-forefront-of-dcs-charge" src="https://static.cricbuzz.com/a/img/v1/90x70/i1/c647855/flexible-rahul-at-the-forefron.jpg"></div><div class="cb-col cb-col-67 txt-hvr-underline" style="height:auto">Flexible Rahul at the forefront of DC's charge</div></div></a></div><div class="cb-col cb-col-50" style="height: 75px; margin:5px 0px;"><a href="/cricket-news/133965/bumrah-joins-mi-squad-ahead-of-home-fixture-against-rcb" title="Bumrah joins MI squad ahead of home fixture against RCB"><div class="thumbnail"><div class="cb-col cb-col-33 cb-pos-rel" style="padding-left:2px!important; overflow:hidden;"><img class="img-responsive" title="bumrah-joins-mi-squad-ahead-of-home-fixture-against-rcb" alt="bumrah-joins-mi-squad-ahead-of-home-fixture-against-rcb" src="https://static.cricbuzz.com/a/img/v1/90x70/i1/c647854/bumrah-joins-mi-squad-ahead-of.jpg"></div><div class="cb-col cb-col-67 txt-hvr-underline" style="height:auto">Bumrah joins MI squad ahead of home fixture against RCB</div></div></a></div><div class="cb-col cb-col-50" style="height: 75px; margin:5px 0px;"><a href="/cricket-news/133963/data-shorts-wadhera-bolsters-pbks-enviable-spin-hitting-prowess" title="Data Shorts: Wadhera bolsters PBKS' enviable spin-hitting prowess"><div class="thumbnail"><div class="cb-col cb-col-33 cb-pos-rel" style="padding-left:2px!important; overflow:hidden;"><img class="img-responsive" title="data-shorts-wadhera-bolsters-pbks-enviable-spin-hitting-prowess" alt="data-shorts-wadhera-bolsters-pbks-enviable-spin-hitting-prowess" src="https://static.cricbuzz.com/a/img/v1/90x70/i1/c647845/data-shorts-wadhera-bolsters-p.jpg"></div><div class="cb-col cb-col-67 txt-hvr-underline" style="height:auto">Data Shorts: Wadhera bolsters PBKS' enviable spin-hitting prowess</div></div></a></div><div class="cb-col cb-col-50" style="height: 75px; margin:5px 0px;"><a href="/cricket-news/133962/adapting-on-the-fly-royals-put-on-a-show-in-kings-den" title="Adapting on the fly, Royals put on a show in Kings' den"><div class="thumbnail"><div class="cb-col cb-col-33 cb-pos-rel" style="padding-left:2px!important; overflow:hidden;"><img class="img-responsive" title="adapting-on-the-fly-royals-put-on-a-show-in-kings-den" alt="adapting-on-the-fly-royals-put-on-a-show-in-kings-den" src="https://static.cricbuzz.com/a/img/v1/90x70/i1/c647844/adapting-on-the-fly-royals-put.jpg"></div><div class="cb-col cb-col-67 txt-hvr-underline" style="height:auto">Adapting on the fly, Royals put on a show in Kings' den</div></div></a></div></div> <div class="cb-col-100 cb-col cb-ad-unit" ng-cloak="" ng-if="!$root.$GEO.isGeo(&quot;EU&quot;)"><div id="native_related_news" class="cb-col-100 cb-col ad-native ng-cloak" ad-loaded="false"></div></div> </article>
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */