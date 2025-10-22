import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

import dbConnect from "./lib/db.js";
// Model Imports
import Horoscope from "./lib/models/astrology.js";
import CareerJob from "./lib/models/carrerjobs.js";
import Chess from "./lib/models/chess.js";
import Cricket from "./lib/models/cricket.js";
import EducationModel from "./lib/models/education.js";
import InternationalModel from "./lib/models/international.js";
import PoliticsModel from "./lib/models/politics.js";
import TechModel from "./lib/models/tech.js";
import TrendingModel from "./lib/models/trending.js";
import Score from "./lib/models/score.js";

// Scraper Imports
import { getAstro } from "./bots/astrology/astrology.js";
import { getJobs as getCareerJobs } from "./bots/careerjobs/jobs.js";
import { getEdu as getEducation } from "./bots/education/education.js";
import { getChess } from "./bots/sports/chess/chess.js";
import { getCricket } from "./bots/sports/cricket/cricket.js";
import { getScore } from "./bots/sports/cricket/game_data.js";
import { getIA as getInternational } from "./bots/international_affairs/ia.js";
import { getPolitics } from "./bots/politics/comparison/politics.js";
import { getTech } from "./bots/tech/tech.js";
import { getTrending } from "./bots/trending/trending.js";

// Delay helper
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function runAllScrapers() {
  await dbConnect();

  const scrapers = [
    {
      name: "Astrology",
      fetch: getAstro,
      save: async (data) => {
        for (const [sign, article] of Object.entries(data)) {
          await Horoscope.updateOne(
            { sign: sign.toLowerCase() },
            { sign: sign.toLowerCase(), ...article },
            { upsert: true }
          );
        }
      },
    },
    {
      name: "Career & Jobs",
      fetch: getCareerJobs,
      save: (data) => CareerJob.insertMany(data, { ordered: false }),
    },
    {
      name: "Education",
      fetch: getEducation,
      save: (data) => EducationModel.insertMany(data, { ordered: false }),
    },
    {
      name: "Chess",
      fetch: getChess,
      save: (data) => Chess.insertMany(data, { ordered: false }),
    },
    {
      name: "Cricket",
      fetch: getCricket,
      save: (data) => Cricket.insertMany(data, { ordered: false }),
    },
    {
      name: "Score",
      fetch: getScore,
      save: async (data) => {
        await Score.deleteMany({}); // Remove old scores
        await Score.insertMany(data, { ordered: false });
      },
    },
    {
      name: "Tech",
      fetch: getTech,
      save: (data) => TechModel.insertMany(data, { ordered: false }),
    },
    {
      name: "Trending",
      fetch: getTrending,
      save: (data) => TrendingModel.insertMany(data, { ordered: false }),
    },
    {
      name: "International Affairs",
      fetch: getInternational,
      save: (data) => InternationalModel.insertMany(data, { ordered: false }),
    },
    {
      name: "Politics",
      fetch: getPolitics,
      save: (data) => PoliticsModel.insertMany(data, { ordered: false }),
    },
  ];

  for (const scraper of scrapers) {
    try {
      console.log(`🚀 Starting ${scraper.name.toLowerCase()} scraper...`);
      const data = await scraper.fetch();
      const isValid =
        Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0;

      if (data && isValid) {
        await scraper.save(data);
        console.log(`✅ ${scraper.name} data saved.`);
      } else {
        console.log(`⚠️ No ${scraper.name.toLowerCase()} data returned or data is empty.`);
      }
    } catch (error) {
      console.error(`❌ Error in ${scraper.name} scraper:`, error);
    }

    const delay = 3000 + Math.floor(Math.random() * 1000);
    console.log(`⏳ Waiting ${delay}ms before next scraper...\n`);
    await sleep(delay);
  }

  console.log("🎉 All scrapers completed.");
}
async function cleanupAndExit() {
  await mongoose.connection.close();
  console.log("🔌 MongoDB connection closed.");
  process.exit(0);
}
await runAllScrapers().then(() => {
  cleanupAndExit();
}).catch((err) => {
  console.error("Fatal error in runAllScrapers:", err);
  cleanupAndExit();
});

