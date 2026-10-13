/**
 * adblock-rules — default blocklist and allowlist for the Nexus ad blocker.
 *
 * These are curated, well-known advertising / tracking / analytics domains.
 * The list is intentionally conservative: we block ad delivery and tracking
 * endpoints, not entire content sites. Per-site exceptions are handled at
 * runtime by the AdBlocker engine (allowlist overrides blocklist).
 *
 * Rule format:
 *   - Exact domain match: "doubleclick.net"
 *   - Domain + subdomains: "googlesyndication.com" (matches sub.foo.com too)
 *   - Wildcard prefix: "*.adserver.com"
 */

'use strict';

/**
 * Domains whose primary purpose is serving ads, tracking, or analytics.
 * Requests to these domains are blocked when the ad blocker is enabled.
 */
const DEFAULT_BLOCKLIST = [
  // Major ad networks
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'googletagservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'adservice.google.com',
  'ads.google.com',
  'adwords.google.com',

  // Facebook / Meta
  'connect.facebook.net',
  'pixel.facebook.com',
  'an.facebook.com',

  // Twitter / X
  'ads-twitter.com',
  'analytics.twitter.com',
  't.co',

  // Amazon
  'amazon-adsystem.com',
  'aax.amazon-adsystem.com',

  // Microsoft
  'bat.bing.com',
  'clarity.ms',
  'browser.events.data.microsoft.com',

  // Other major ad networks
  'adnxs.com',
  'criteo.com',
  'criteo.net',
  'pubmatic.com',
  'rubiconproject.com',
  'openx.net',
  'taboola.com',
  'outbrain.com',
  'mgid.com',
  'adsterra.com',
  'propellerads.com',
  'popads.net',
  'popcash.net',
  'adcash.com',
  'infolinks.com',
  'revcontent.com',
  'mediavine.com',
  'adthrive.com',
  'ezoic.net',
  'ezoic.com',
  'snigelweb.com',

  // Analytics & telemetry
  'mixpanel.com',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'hotjar.com',
  'mouseflow.com',
  'fullstory.com',
  'logrocket.com',
  'quantserve.com',
  'quantcount.com',
  'scorecardresearch.com',
  'nr-data.net',
  'newrelic.com',
  'bugsnag.com',
  'sentry.io',
  'stats.g.doubleclick.net',

  // Common tracking pixels & beacons
  'pixel.adsafeprotected.com',
  'adsafeprotected.com',
  'tracking.adnxs.com',
  'ib.adnxs.com',
  'fastlane.rubiconproject.com',
  'bid.g.doubleclick.net',

  // Ad-blocking circumvention / fingerprinting
  'adguard.org',
  'adblockplus.org',

  // Mobile-style ad SDKs (sometimes embedded in web views)
  'applovin.com',
  'unityads.unity3d.com',
  'chartboost.com',
  'mopub.com',
  'inmobi.com',
  'media.net',
  'yieldmo.com',
  'sharethrough.com',
];

/**
 * Domains that should NEVER be blocked, even if they match a blocklist rule.
 * This prevents the ad blocker from breaking legitimate sites.
 */
const DEFAULT_ALLOWLIST = [
  'google.com',
  'www.google.com',
  'accounts.google.com',
  'youtube.com',
  'www.youtube.com',
  'github.com',
  'raw.githubusercontent.com',
];

module.exports = { DEFAULT_BLOCKLIST, DEFAULT_ALLOWLIST };