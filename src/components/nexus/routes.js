// Maps nexus:// internal routes to view keys used by the app shell.
export const INTERNAL_ROUTES = {
  "nexus://home": "home",
  "nexus://start": "home",
  "nexus://search": "search",
  "nexus://premium": "premium",
  "nexus://vpn": "vpn",
  "nexus://assistant": "assistant",
  "nexus://bookmarks": "bookmarks",
  "nexus://readinglist": "readinglist",
  "nexus://history": "history",
  "nexus://downloads": "downloads",
  "nexus://notes": "notes",
  "nexus://research": "research",
  "nexus://extensions": "extensions",
  "nexus://privacy": "privacy",
  "nexus://security": "security",
  "nexus://shield": "shield",
  "nexus://fingerprint": "fingerprint",
  "nexus://permissions": "permissions",
  "nexus://transparency": "transparency",
  "nexus://audit": "audit",
  "nexus://performance": "performance",
  "nexus://diagnostics": "diagnostics",
  "nexus://ai-models": "ai-models",
  "nexus://settings": "settings",
  "nexus://workspaces": "workspaces",
  "nexus://tabs": "tabs",
  "nexus://incognito": "incognito",
  "nexus://insecure-blocked": "insecure-blocked",
  "nexus://site-check": "site-check",
  "nexus://search-privacy": "search-privacy",
  "nexus://sessions": "sessions",
  "nexus://toolbox": "toolbox",
  "nexus://labs": "labs",
  "nexus://keyboard": "keyboard",
  "nexus://updates": "updates",
  "nexus://download": "download",
  "nexus://recovery": "recovery",
  "nexus://default-browser": "default-browser",
};

export function isInternal(url) {
  return typeof url === "string" && url.startsWith("nexus://");
}

export function viewForUrl(url) {
  if (!isInternal(url)) return null;
  const base = url.split("?")[0].replace(/\/+$/, "");
  return INTERNAL_ROUTES[base] || "home";
}