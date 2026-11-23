// Site gate: runs in front of a site's own code on every request.
//
//  1. Thailand only: visitors Cloudflare places outside ALLOWED (default TH) get a short
//     "not available" page (HTML) or a 403 (everything else). Exceptions: link-preview
//     bots may fetch pages/images so shared links keep their preview, the private stats
//     page is reachable anywhere (it has its own key), and optionally Cloudflare's own
//     network (for sites that render themselves with Browser Rendering).
//  2. Private stats page at /_stats, backed by the central site-stats Worker.
//  3. Every request is logged to site-stats after the response is handed back, with the
//     visitor's network (e.g. AIS, True, Amazon) and browser.
//  4. Browser check: pages get a tiny same-site script (/_gate/b.js) that reports back
//     when the page really ran in a browser; most bots never run it.
//
// If anything in the gate itself fails, the request goes straight to the site as before.

import STATS_PAGE from "./stats-page.mjs";

const DEFAULT_ALLOWED = ["TH"];
const CLOUDFLARE_ASN = 13335;
const STATS_PATHS = ["/_stats"];
const STATS_APIS = ["/_stats/api"];
const BEACON_JS = "/_gate/b.js";
const BEACON_HIT = "/_gate/hit";

// Self-declared bots and tools. Crawlers and scanners usually give a contact address
// ("+https://…") or say "compatible; Name/1.0" without being a real browser.
const BOT = /site-gate-check|bot|crawl|spider|slurp|facebookexternalhit|preview|curl|wget|python|headless|lighthouse|monitor|uptime|scan|fetch|http-client|go-http|java\/|okhttp|axios|node-fetch|undici|libwww|scrapy|phantom|selenium|puppeteer|playwright|measurement|research|zgrab|masscan|nmap|nuclei|censys|shodan|expanse|netcraft|\+https?:\/\/|@[\w-]+\.\w+/i;
const LINK_PREVIEW = /facebookexternalhit|facebot|line-poker|linebot|twitterbot|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|skypeuripreview|kakaotalk/i;
const PREVIEWABLE = /(^\/$|\/[^./]*$|\.html?$|\.(png|jpe?g|webp|gif|svg|ico)$)/i;

const BEACON_SOURCE = `(function(){try{var d=JSON.stringify({p:location.pathname});` +
  `if(!(navigator.sendBeacon&&navigator.sendBeacon(${JSON.stringify(BEACON_HIT)},new Blob([d],{type:"application/json"}))))` +
  `fetch(${JSON.stringify(BEACON_HIT)},{method:"POST",body:d,keepalive:true,headers:{"content-type":"application/json"}})}catch(e){}})();`;

function device(ua) {
  if (BOT.test(ua)) return "bot";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return ua ? "desktop" : "unknown";
}

function browser(ua) {
  if (!ua) return "none";
  // Most specific first: in-app browsers and Chrome-based browsers also say "Chrome"/"Safari".
  for (const [re, name] of [
    [/\bLine\//, "LINE app"], [/FBAN|FBAV|FB_IAB/, "Facebook app"], [/Instagram/, "Instagram app"],
    [/SamsungBrowser\//, "Samsung Internet"], [/\bEdg(A|iOS)?\//, "Edge"], [/\bOPR\/|Opera/, "Opera"],
    [/YaBrowser\//, "Yandex"], [/CriOS\//, "Chrome"], [/FxiOS\/|Firefox\//, "Firefox"],
    [/Chrome\/[\d.]+/, "Chrome"], [/Version\/[\d.]+.*Safari/, "Safari"],
  ]) if (re.test(ua)) return name;
  // "Mozilla/5.0 (compatible; InternetMeasurement/1.0; +https://…)": the real name is inside.
  const compatible = ua.match(/compatible;\s*([A-Za-z][\w .-]*?)\/[\d.]/);
  if (compatible && !/^MSIE/.test(compatible[1])) return compatible[1].slice(0, 40);
  const tool = ua.match(/^([A-Za-z][\w.-]*)\//);
  return tool && tool[1] !== "Mozilla" ? tool[1].slice(0, 40) : "other";
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

async function visitorId(ip, ua, day) {
  // Daily, one-way hash: counts unique visitors without storing IP addresses.
  const data = new TextEncoder().encode(`${ip}|${ua}|${day}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...hash.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isBlocked(request, url, opts) {
  const cf = request.cf;
  const country = cf?.country;
  if (!country) return false; // local development: no location information
  if (statsPaths(opts).includes(url.pathname) || statsApis(opts).includes(url.pathname)) return false;
  // Paths a site protects with its own key (e.g. an API that a service abroad calls).
  if ((opts.allowPaths || []).some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) return false;
  if ((opts.allowed || DEFAULT_ALLOWED).includes(country.toUpperCase())) return false;
  if (opts.allowCloudflareNetwork && cf.asn === CLOUDFLARE_ASN) return false;
  const ua = request.headers.get("user-agent") || "";
  // linkPreviews: false (a private site, where a preview would only show the sign-in page): no exception for
  // link-preview robots. Anyone abroad could otherwise pass the country rule by sending such a robot's name.
  if (opts.linkPreviews !== false && (request.method === "GET" || request.method === "HEAD") && !url.pathname.startsWith("/api/")
      && PREVIEWABLE.test(url.pathname) && LINK_PREVIEW.test(ua)) return false;
  return true;
}

const statsPaths = (opts) => [...STATS_PATHS, ...(opts.statsPaths || [])];
const statsApis = (opts) => [...STATS_APIS, ...(opts.statsApis || [])];

const BLOCKED_PAGE = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>ไม่เปิดให้เข้าชม · Not available</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 16px;
         background:#f7f5f0; color:#2b2b2b; font:16px/1.7 "Sarabun", system-ui, -apple-system, sans-serif; text-align:center; }
  main { max-width:420px; }
  p { margin:0 0 6px; }
  .en { color:#6f6f6f; font-size:14px; margin-top:18px; }
</style>
</head>
<body>
<main>
  <p>ขออภัย เว็บไซต์นี้เปิดให้เข้าชมเฉพาะภายในประเทศไทย</p>
  <p class="en">Sorry, this site is only available in Thailand.</p>
</main>
</body>
</html>`;

function blockedResponse(request) {
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };
  const accept = request.headers.get("accept") || "";
  if (request.method === "GET" && accept.includes("text/html")) {
    return new Response(BLOCKED_PAGE, { status: 403, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  }
  return Response.json({ error: "Not available outside Thailand" }, { status: 403, headers });
}

async function statsResponse(request, url, env, opts) {
  if (statsPaths(opts).includes(url.pathname)) {
    const config = JSON.stringify({ mode: "site", api: STATS_APIS[0], label: opts.site });
    const html = STATS_PAGE.replace(/\/\*CONFIG\*\/[\s\S]*?\/\*END\*\//, () => config);
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
    });
  }
  const days = url.searchParams.get("days") || "30";
  const data = await env.SITE_STATS.summary(opts.site, days, request.headers.get("x-stats-key") || "");
  const status = data?.error === "wrong key" ? 401 : data?.error ? 404 : 200;
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function classify(request, url, response, ua, blocked, opts) {
  if (blocked) return "blocked";
  for (const [method, prefix, kind, multipart] of opts.kinds || []) {
    if (request.method === method && url.pathname.startsWith(prefix)
        && (!multipart || (request.headers.get("content-type") || "").includes("multipart/form-data"))) return kind;
  }
  const type = response.headers.get("content-type") || "";
  // A page view is a request for a page (not e.g. /favicon.ico answered with the home page).
  const wantsPage = (request.headers.get("sec-fetch-dest") || "document") === "document"
    && (request.headers.get("accept") || "").includes("text/html");
  if (request.method === "GET" && response.status < 400 && type.includes("text/html") && wantsPage) return BOT.test(ua) ? "bot" : "page";
  if (url.pathname.startsWith("/api/")) return "api";
  return "asset";
}

function baseHit(request, url, ts, ua) {
  const ref = request.headers.get("referer");
  let referer = null;
  try { if (ref && new URL(ref).host !== url.host) referer = new URL(ref).host; } catch {}
  const cf = request.cf || {};
  return {
    ts, method: request.method, path: safeDecode(url.pathname).slice(0, 300),
    bytesIn: parseInt(request.headers.get("content-length")) || 0,
    country: cf.country, city: cf.city, region: cf.region, colo: cf.colo,
    asn: cf.asn ?? null, asOrg: cf.asOrganization ? String(cf.asOrganization).slice(0, 80) : null,
    device: device(ua), browser: browser(ua), ua: ua.slice(0, 200), referer,
  };
}

async function logHit(env, opts, request, hit) {
  try {
    const ip = request.headers.get("cf-connecting-ip") || "";
    const ua = request.headers.get("user-agent") || "";
    hit.visitor = await visitorId(ip, ua, new Date(hit.ts).toISOString().slice(0, 10));
    await env.SITE_STATS.log(opts.site, hit);
  } catch (e) { console.error("site-gate: log failed", String(e)); }
}

// The browser check: /_gate/b.js is added to each page; it posts to /_gate/hit.
async function beaconResponse(request, url, env, ctx, opts) {
  if (url.pathname === BEACON_JS) {
    return new Response(BEACON_SOURCE, {
      headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=86400" },
    });
  }
  if (request.method !== "POST") return new Response(null, { status: 405 });
  let path = "/";
  try { path = String((await request.json()).p || "/").slice(0, 300); } catch {}
  const ua = request.headers.get("user-agent") || "";
  const hit = { ...baseHit(request, url, Date.now(), ua), kind: "js", status: 204, path };
  ctx.waitUntil(logHit(env, opts, request, hit));
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

function addBeacon(response) {
  if (typeof HTMLRewriter === "undefined") return response;
  return new HTMLRewriter()
    .on("body", { element(el) { el.append(`<script src="${BEACON_JS}" defer></script>`, { html: true }); } })
    .transform(response);
}

// opts: { site, allowed?, allowCloudflareNetwork?, allowPaths?, kinds?, statsPaths?, statsApis?, noBeacon? }
// next: (request) => Promise<Response>, the site as it was before the gate.
export async function gate(request, env, ctx, opts, next) {
  let url, blocked;
  try {
    url = new URL(request.url);
    if (env.SITE_STATS && (statsPaths(opts).includes(url.pathname) || statsApis(opts).includes(url.pathname))) {
      return await statsResponse(request, url, env, opts);
    }
    blocked = isBlocked(request, url, opts);
    if (env.SITE_STATS && !blocked && !opts.noBeacon && (url.pathname === BEACON_JS || url.pathname === BEACON_HIT)) {
      return await beaconResponse(request, url, env, ctx, opts);
    }
  } catch (e) {
    console.error("site-gate: gate failed", String(e));
    return next(request);
  }

  let response = blocked ? blockedResponse(request) : await next(request);
  try {
    if (!env.SITE_STATS || response.status === 101 || response.webSocket) return response;
    const ts = Date.now();
    const ua = request.headers.get("user-agent") || "";
    const kind = classify(request, url, response, ua, blocked, opts);
    if (kind === "page" && response.status === 200 && !opts.noBeacon) response = addBeacon(response);
    const hit = { ...baseHit(request, url, ts, ua), kind, status: response.status };
    const send = (bytesOut) => logHit(env, opts, request, Object.assign(hit, { bytesOut }));
    const length = response.headers.get("content-length");
    if (length !== null || !response.body) {
      ctx.waitUntil(send(parseInt(length) || 0));
      return response;
    }
    // No Content-Length (compressed or streamed): measure a copy of the body in the
    // background while the original goes to the visitor.
    const [toVisitor, toCount] = response.body.tee();
    ctx.waitUntil((async () => {
      let count = 0;
      try {
        const reader = toCount.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          count += value.byteLength;
        }
      } catch {}
      await send(count);
    })());
    return new Response(toVisitor, response);
  } catch (e) {
    console.error("site-gate: logging setup failed", String(e));
    return response;
  }
}
