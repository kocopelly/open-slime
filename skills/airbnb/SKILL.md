---
name: airbnb
description: Search Airbnb listings and get property details via the custom-api sidecar.
metadata:
  { "openclaw": { "emoji": "🏠", "always": true } }
---

# Airbnb

Base URL: `http://custom-api:3002/api/airbnb`

## Search listings

```
curl -s 'http://custom-api:3002/api/airbnb/search?location=Nashville,+TN&checkin=2026-04-17&checkout=2026-04-19&adults=2&maxPrice=200'
```

Query params:
- `location` (required) — city, state, region (e.g. "San Francisco, CA")
- `checkin` — check-in date (YYYY-MM-DD)
- `checkout` — check-out date (YYYY-MM-DD)
- `adults` — number of adults (default 1)
- `children` — number of children (default 0)
- `infants` — number of infants (default 0)
- `pets` — number of pets (default 0)
- `minPrice` — minimum price per night
- `maxPrice` — maximum price per night
- `cursor` — pagination cursor (from previous response's `paginationInfo`)

Returns: `{searchUrl, count, listings: [{id, url, ...}], paginationInfo}`

Each listing includes: ID, direct Airbnb URL, rating, price breakdown, location info, badges.

## Get listing details

```
curl -s 'http://custom-api:3002/api/airbnb/listing/12345678?checkin=2026-04-17&checkout=2026-04-19&adults=2'
```

Path param: listing ID (from search results).

Optional query params: `checkin`, `checkout`, `adults`, `children`, `infants`, `pets`.

Returns: `{listingUrl, details}` — includes location (lat/lng), amenities, house rules, description, highlights.

## Health check

```
curl -s http://custom-api:3002/health
```

## Notes

- Use `curl -s` for all requests. Parse JSON with `jq` when needed.
- Airbnb scraping can be flaky — if you get a 502, retry once.
- Always provide direct Airbnb URLs to users so they can book.
- Price is per-night unless the response indicates otherwise.
