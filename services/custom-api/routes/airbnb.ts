import { Hono } from "hono";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const airbnb = new Hono();

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE_URL = "https://www.airbnb.com";

// ── Helpers ──────────────────────────────────────────────────

async function fetchPage(url: string, timeout = 30_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal as any,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function cleanObject(obj: any): any {
  if (Array.isArray(obj)) return obj.map(cleanObject).filter((v: any) => v != null);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleaned = cleanObject(v);
      if (cleaned != null && cleaned !== "") out[k] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return obj;
}

function pickBySchema(obj: any, schema: any): any {
  if (!obj || typeof obj !== "object" || schema === true) return obj;
  if (Array.isArray(obj)) return obj.map((item) => pickBySchema(item, schema));
  const out: any = {};
  for (const key of Object.keys(schema)) {
    if (key in obj) {
      out[key] = typeof schema[key] === "object" && schema[key] !== null && schema[key] !== true
        ? pickBySchema(obj[key], schema[key])
        : obj[key];
    }
  }
  return out;
}

function flattenArrays(obj: any): any {
  if (Array.isArray(obj)) {
    const mapped = obj.map(flattenArrays);
    return mapped.length === 1 ? mapped[0] : mapped;
  }
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = flattenArrays(v);
    return out;
  }
  return obj;
}

// ── Search ───────────────────────────────────────────────────

const SEARCH_PICK_SCHEMA = {
  demandStayListing: { id: true, description: true, location: true },
  badges: { text: true },
  structuredContent: {
    mapCategoryInfo: { body: true },
    mapSecondaryLine: { body: true },
    primaryLine: { body: true },
    secondaryLine: { body: true },
  },
  avgRatingA11yLabel: true,
  listingParamOverrides: true,
  structuredDisplayPrice: {
    primaryLine: { accessibilityLabel: true },
    secondaryLine: { accessibilityLabel: true },
    explanationData: {
      title: true,
      priceDetails: { items: { description: true, priceString: true } },
    },
  },
};

airbnb.get("/search", async (c) => {
  const location = c.req.query("location");
  if (!location) return c.json({ error: "location query param required" }, 400);

  const url = new URL(`${BASE_URL}/s/${encodeURIComponent(location)}/homes`);
  for (const key of ["checkin", "checkout", "cursor"]) {
    const v = c.req.query(key);
    if (v) url.searchParams.set(key, v);
  }
  const intParams: Record<string, string> = {
    adults: "adults", children: "children", infants: "infants",
    pets: "pets", minPrice: "price_min", maxPrice: "price_max",
  };
  for (const [qs, airbnbKey] of Object.entries(intParams)) {
    const v = c.req.query(qs);
    if (v) url.searchParams.set(airbnbKey, v);
  }

  try {
    const html = await fetchPage(url.toString());
    const $ = cheerio.load(html);
    const script = $("#data-deferred-state-0").first().text();
    if (!script) return c.json({ error: "Could not find data in page — Airbnb may have changed structure", searchUrl: url.toString() }, 502);

    const clientData = JSON.parse(script).niobeClientData[0][1];
    const results = clientData.data.presentation.staysSearch.results;
    cleanObject(results);

    const listings = results.searchResults
      .map((r: any) => flattenArrays(pickBySchema(r, SEARCH_PICK_SCHEMA)))
      .map((r: any) => {
        const id = atob(r.demandStayListing.id).split(":")[1];
        return { id, url: `${BASE_URL}/rooms/${id}`, ...r };
      });

    return c.json({
      searchUrl: url.toString(),
      count: listings.length,
      listings,
      paginationInfo: results.paginationInfo ?? null,
    });
  } catch (e: any) {
    return c.json({ error: e.message, searchUrl: url.toString() }, 502);
  }
});

// ── Listing Details ──────────────────────────────────────────

const DETAIL_SECTION_SCHEMA: Record<string, any> = {
  LOCATION_DEFAULT: { lat: true, lng: true, subtitle: true, title: true },
  POLICIES_DEFAULT: {
    title: true,
    houseRulesSections: { title: true, items: { title: true } },
  },
  HIGHLIGHTS_DEFAULT: { highlights: { title: true } },
  DESCRIPTION_DEFAULT: { htmlDescription: { htmlText: true } },
  AMENITIES_DEFAULT: {
    title: true,
    seeAllAmenitiesGroups: { title: true, amenities: { title: true } },
  },
};

airbnb.get("/listing/:id", async (c) => {
  const id = c.req.param("id");
  const url = new URL(`${BASE_URL}/rooms/${id}`);

  const dateParams: Record<string, string> = { checkin: "check_in", checkout: "check_out" };
  for (const [qs, airbnbKey] of Object.entries(dateParams)) {
    const v = c.req.query(qs);
    if (v) url.searchParams.set(airbnbKey, v);
  }
  for (const key of ["adults", "children", "infants", "pets"]) {
    const v = c.req.query(key);
    if (v) url.searchParams.set(key, v);
  }

  try {
    const html = await fetchPage(url.toString());
    const $ = cheerio.load(html);
    const script = $("#data-deferred-state-0").first().text();
    if (!script) return c.json({ error: "Could not find data in page", listingUrl: url.toString() }, 502);

    const clientData = JSON.parse(script).niobeClientData[0][1];
    const sections = clientData.data.presentation.stayProductDetailPage.sections.sections;
    sections.forEach((s: any) => cleanObject(s));

    const details = sections
      .filter((s: any) => DETAIL_SECTION_SCHEMA[s.sectionId])
      .map((s: any) => ({
        id: s.sectionId,
        ...flattenArrays(pickBySchema(s.section, DETAIL_SECTION_SCHEMA[s.sectionId])),
      }));

    return c.json({ listingUrl: url.toString(), details });
  } catch (e: any) {
    return c.json({ error: e.message, listingUrl: url.toString() }, 502);
  }
});

export default airbnb;
