"use strict";
// Rate-limited fetch with retry/backoff.
//
// Every upstream we use (Steam, Wikipedia, AniList, TVMaze) rate-limits
// or outright drops connections when hit in parallel from one IP — the
// first version of this script fired every request at once and Steam
// started timing out. So: one request at a time per host, with a small
// gap, and a bounded retry with backoff for the flaky ones.

const HOST_GAPS = {
  "store.steampowered.com": 1200,
  "api.anilist.co": 700,
  "api.tvmaze.com": 400,
};

// Wikimedia rejects bursts hard (HTTP 429 with a plain-text body, not
// JSON). The gap is deliberately conservative: a 429 costs a
// multi-second backoff, so waiting is far cheaper than retrying.
//
// Matched by suffix rather than listed host by host. The provider now
// searches Spanish, French, German, Italian, Portuguese, Russian,
// Japanese, Korean and Chinese wikis, plus Wikidata — listing them
// individually meant every language added later silently ran with the
// generic 600ms gap and started earning 429s.
const WIKIMEDIA_GAP = 1400;
const WIKIMEDIA_HOST = /(?:\.wikipedia\.org|\.wikidata\.org)$/;

function gapFor(host) {
  if (HOST_GAPS[host]) return HOST_GAPS[host];
  if (WIKIMEDIA_HOST.test(host)) return WIKIMEDIA_GAP;
  return 600;
}

const lastHit = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikimedia and Steam both want a contactable UA rather than a default
// node one.
const DRIVE_DEALS_UA = "drive-deals-details/1.0 (https://github.com/drive-deals; static site build tool)";

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/** Wait until this host's cooldown has elapsed. */
async function throttle(url) {
  const host = hostOf(url);
  const gap = gapFor(host);
  const prev = lastHit.get(host) || 0;
  const wait = prev + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

/**
 * GET a URL as JSON, retrying on network errors, 429 and 5xx.
 *
 * Returns null when the response is unusable after `tries` attempts, and
 * throws when the failure was transient (rate limit, 5xx, network).
 *
 * That distinction matters: the callers treat null as "this source has
 * no entry for this title" and move on, while a thrown error means the
 * lookup never really happened. Returning null for a rate limit would
 * silently file hundreds of items as misses — which is exactly what
 * happens when two fill jobs share one IP.
 */
async function getJson(url, { tries = 3, headers = {} } = {}) {
  let lastStatus = null;
  let lastError = null;
  for (let attempt = 1; attempt <= tries; attempt++) {
    await throttle(url);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": DRIVE_DEALS_UA,
          // Wikimedia asks anonymous API clients to declare this.
          "Accept": "application/json",
          ...headers,
        },
        signal: AbortSignal.timeout(20000),
      });

      if (res.status === 429) {
        // Wikimedia's limits are per-minute, so a short sleep only earns
        // another 429. Back off hard, and say so — a caller that cannot
        // tell "no match" from "rate limited" will record a miss for an
        // item it never actually looked up.
        if (process.env.DD_HTTP_TRACE) {
          console.error(`  429 from ${hostOf(url)} (attempt ${attempt})`);
        }
        lastStatus = 429;
        await sleep(8000 * attempt);
        continue;
      }
      if (res.status >= 500) {
        lastStatus = res.status;
        await sleep(1500 * attempt);
        continue;
      }
      // A 404 is a real answer: "this source has no such page".
      if (!res.ok) return null;

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        lastStatus = "unparseable";
        await sleep(1500 * attempt);
      }
    } catch (err) {
      lastError = err;
      await sleep(1000 * attempt);
    }
  }

  // Transient failure: the lookup never happened, so the caller must not
  // treat this as "no match".
  const err = new Error(
    `request failed after ${tries} attempts (${lastStatus || (lastError && lastError.message) || "unknown"})`,
  );
  err.transient = true;
  throw err;
}

/** POST JSON to AniList's GraphQL endpoint. */
async function postJson(url, body, { tries = 3 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    await throttle(url);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "drive-deals-details/1.0" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * attempt);
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await sleep(1000 * attempt);
    }
  }
  return null;
}

module.exports = { getJson, postJson, sleep };