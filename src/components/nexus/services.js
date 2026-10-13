import { base44 } from "@/api/base44Client";
import { assistant as assistantFn } from "@/functions/assistant";
import { search as searchFn } from "@/functions/search";
import { entitlements as entitlementsFn } from "@/functions/entitlements";
import { diagnostics as diagnosticsFn } from "@/functions/diagnostics";

export const NexusServices = {
  assistant: (payload) => assistantFn(payload).then((r) => r.data),
  search: (payload) => searchFn(payload).then((r) => r.data),
  entitlements: () => entitlementsFn({}).then((r) => r.data),
  diagnostics: () => diagnosticsFn({}).then((r) => r.data),
};

// Settings persistence (keyed records per user)
export async function getSetting(key, fallback) {
  try {
    const rows = await base44.entities.NexusSettings.filter({ key });
    return rows[0]?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  const rows = await base44.entities.NexusSettings.filter({ key });
  if (rows[0]) return base44.entities.NexusSettings.update(rows[0].id, { value });
  return base44.entities.NexusSettings.create({ key, value });
}

export default NexusServices;