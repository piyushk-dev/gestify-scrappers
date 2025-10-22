# Gestify Scrapers 🤖

> Automated news scraping service that runs daily to keep Gestify's content fresh and up-to-date.

---

## 🎯 Purpose

This repository contains the scraping infrastructure for [Gestify](https://github.com/piyushk-dev/gestify). It runs on a scheduled basis to fetch the latest news articles from multiple sources and updates stale content in the database.

---

## 🔄 How It Works

- **Scheduled Execution** — Runs automatically every 12 hours via GitHub Actions
- **Stale Data Detection** — Identifies outdated articles that need refreshing
- **Multi-Source Scraping** — Fetches content from configured news sources
- **Database Sync** — Updates MongoDB with fresh data
- **Error Handling** — Graceful failure recovery with logging

---

## 🛠️ Tech Stack

- **Node.js** with TypeScript
- **GitHub Actions** for scheduling
- **MongoDB** for data storage
- **Puppeteer/Cheerio** for web scraping (implementation TBD)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm package manager
- Access to Gestify databases

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/piyushk-dev/gestify-scrappers.git
cd gestify-scrappers
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

Fill in your credentials:

```env
# Databases
MONGODB_URI=your_mongodb_uri
API_KEY=your_api_key

```

**3. Install dependencies**

```bash
pnpm install
```

**4. Run manually (for testing)**

```bash
pnpm start
```

---

## 📋 Database Schema

> ⚠️ **Work in Progress** — Database schema is currently being finalized.

The scraper will interact with the following data structures:

- Article metadata (title, source, URL, publish date)
- Summary content
- Source tracking
- Freshness timestamps

TODO: Finalize and document the database schema for scraper data storage.
---

## 🤝 Integration with Gestify

This scraper works in tandem with Gestify's ISR (Incremental Static Regeneration) strategy:

1. **ISR** — Regenerates pages every 6 hours
2. **Scraper** — Fetches new articles daily
3. **Result** — Always-fresh content with optimal performance

---

## 📝 Development Status

- [x] Repository setup
- [x] GitHub Actions workflow
- [ ] Database schema finalization
- [ ] Scraper implementation
- [ ] Error handling & logging
- [ ] Source configuration
- [ ] Testing suite

---

## 🤝 Contributing

This is an active work-in-progress. Contributions are welcome!

---

**Part of the [Gestify](https://github.com/piyushk-dev/gestify) ecosystem**