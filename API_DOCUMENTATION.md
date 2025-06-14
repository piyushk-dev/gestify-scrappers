# Scrapers API Documentation

## Overview
This document describes the data structure and API endpoints for the news scraping system.

## Data Structure

### 1. Astrology Data
**Endpoint**: `/api/astrology`
**Structure**: Object with zodiac signs as keys
```json
{
  "aries": {
    "sign": "aries",
    "title": "Article title",
    "link": "https://example.com/article",
    "story_summary": "Concise summary of the horoscope",
    "tags": ["aries", "horoscope", "astrology"],
    "date": "2025-06-13T00:00:00.000Z"
  },
  "taurus": { ... },
  // ... other zodiac signs
}
```

### 2. Career & Jobs Data
**Endpoint**: `/api/career-jobs`
**Structure**: Array of articles
```json
[
  {
    "title": "Job opportunity title",
    "link": "https://example.com/job",
    "story_summary": "Summary of the job posting",
    "tags": ["jobs", "recruitment", "government"],
    "date": "2025-06-13T00:00:00.000Z",
    "image": "https://example.com/image.jpg"
  }
]
```

### 3. Education Data
**Endpoint**: `/api/education`
**Structure**: Array of articles
```json
[
  {
    "title": "Education news title",
    "link": "https://example.com/education",
    "story_summary": "Summary of education news",
    "tags": ["education", "exams", "results"],
    "date": "2025-06-13T00:00:00.000Z",
    "image": "https://example.com/image.jpg"
  }
]
```

### 4. Chess Data
**Endpoint**: `/api/chess`
**Structure**: Array of articles
```json
[
  {
    "title": "Chess tournament news",
    "link": "https://chess.com/article",
    "story_summary": "Summary of chess news",
    "tags": ["chess", "tournament", "gm"],
    "date": "2025-06-13T00:00:00.000Z",
    "image": "https://example.com/image.jpg"
  }
]
```

### 5. Cricket Data
**Endpoint**: `/api/cricket`
**Structure**: Array of articles
**Note**: Cricket has different schema - story_summary is an array and tags is a string
```json
[
  {
    "title": "Cricket match update",
    "link": "https://cricbuzz.com/article",
    "story_summary": ["Line 1 of summary", "Line 2 of summary"],
    "tags": "cricket,ipl,match",
    "date": "2025-06-13T00:00:00.000Z",
    "image": "https://example.com/image.jpg"
  }
]
```

### 6. Tech Data
**Endpoint**: `/api/tech`
**Structure**: Array of articles
```json
[
  {
    "title": "Latest tech news",
    "link": "https://gadgets360.com/article",
    "story_summary": "Summary of tech news",
    "tags": ["tech", "gadgets", "review"],
    "date": "2025-06-13T00:00:00.000Z",
    "image": "https://example.com/image.jpg"
  }
]
```

### 7. Trending Data
**Endpoint**: `/api/trending`
**Structure**: Array of articles with sentiment analysis
```json
[
  {
    "title": "Trending news title",
    "link": "https://livemint.com/article",
    "story_summary": "Summary of trending news",
    "tags": ["trending", "viral", "news"],
    "date": "2025-06-13T00:00:00.000Z",
    "image": "https://example.com/image.jpg",
    "sentiment": "positive"
  }
]
```

### 8. International Affairs Data
**Endpoint**: `/api/international-affairs`
**Structure**: Array of articles
```json
[
  {
    "title": "International news title",
    "link": "https://example.com/international",
    "story_summary": "Summary of international news",
    "tags": ["international", "politics", "world"],
    "date": "2025-06-13T00:00:00.000Z",
    "image": "https://example.com/image.jpg"
  }
]
```

### 9. Politics Data
**Endpoint**: `/api/politics`
**Structure**: Array of political analysis objects with sentiment and contrasting views
```json
[
  {
    "title": "Biden Unveils New Economic Policy Ahead of Election",
    "story_summary": "President Biden introduced a new economic policy aiming to support middle-class families. The policy has received mixed reactions across media outlets.",
    "sentiment": {
      "label": "neutral",
      "score": 0.05
    },
    "source_articles": [
      {
        "source_name": "CNN",
        "url": "https://cnn.com/article..."
      },
      {
        "source_name": "Fox News", 
        "url": "https://foxnews.com/article..."
      },
      {
        "source_name": "Reuters",
        "url": "https://reuters.com/article..."
      }
    ],
    "contrasting_views": [
      {
        "claim": "The policy will boost the economy and support middle-class Americans.",
        "supporters": ["CNN"],
        "opposers": ["Fox News"],
        "neutral": ["Reuters"]
      },
      {
        "claim": "The plan may raise taxes and lacks detail.",
        "supporters": ["Fox News"],
        "opposers": [],
        "neutral": ["Reuters"]
      }
    ],
    "tags": ["biden", "economy", "2024election"],
    "date": "2025-06-13T00:00:00.000Z"
  }
]
```

## Data Types

### Common Fields
- `title`: String - Article headline
- `link`: String (URI) - Full URL to the article
- `story_summary`: String or Array - Article summary (varies by section)
- `tags`: Array of strings or String - Relevant keywords
- `date`: String (ISO Date) - Publication date
- `image`: String (URI) - Optional image URL

### Special Fields
- `sign`: String (Astrology only) - Zodiac sign enum
- `sentiment`: String (Trending only) - "positive", "neutral", or "negative"
- `sentiment`: Object (Politics only) - Contains label and numerical score
- `source_articles`: Array (Politics only) - Multiple news sources for comparison
- `contrasting_views`: Array (Politics only) - Different perspectives on claims with source attribution

## Usage Notes

1. **Date Format**: All dates are in ISO 8601 format
2. **Image URLs**: May be optional for some articles
3. **Tags**: Format varies - arrays for most sections, comma-separated string for cricket
4. **Summary**: Most sections use string format, cricket uses array format
5. **Error Handling**: Check for null/undefined values, especially for optional fields

## MongoDB Collections

Each data type corresponds to a MongoDB collection:
- `horoscopes` - Astrology data
- `careerjobs` - Career & Jobs data
- `educations` - Education data
- `chesses` - Chess data
- `crickets` - Cricket data
- `teches` - Tech data
- `trendings` - Trending data
- `internationals` - International Affairs data
- `politics` - Politics data
