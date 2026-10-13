import React, { useState } from "react";
import {
  House, Sparkles, Layers, Clock, Star, Download, Puzzle, Briefcase,
  Settings, Crown, Shield, Search, FileText, Gauge, Activity,
  ChevronLeft, ChevronRight, BookMarked, History as HistoryIcon,
  Wrench, FlaskConical, Keyboard, Lock, EyeOff, Fingerprint, ShieldCheck, Eye,
} from "lucide-react";
import NexusLogo from "./NexusLogo";

/**
 * Sidebar — the primary navigation rail.
 *
 * Architecture rule: the sidebar holds ONLY primary navigation and key
 * system entries. Secondary tools live in the Side Panel, Command Center,
 * or contextual surfaces — never cluttering this rail.
 *
 * Grouped into:
 *  - Primary: Home, Search, Tabs
 *  - Library: History, Bookmarks, Reading List, Downloads, Notes
 *  - System: Workspaces, Extensions, Performance, Settings
 *  - Nexus: Assistant, Premium, VPN
 */
export default function Sidebar({ view, onNavigateView, onHome, tabCount }) {
  const [collapsed, setCollapsed] = useState(false);

  const groups = [
    {
      label: "Browse",
      items: [
        { label: "Home", icon: House, action: onHome, active: view === "home" },
        { label: "Search", icon: Search, action: () => onNavigateView("search"), active: view === "search" },
        { label: "Tabs", icon: Layers, action: () => onNavigateView("tabs"), badge: tabCount, active: view === "tabs" },
      ],
    },
    {
      label: "Library",
      items: [
        { label: "History", icon: Clock, action: () => onNavigateView("history"), active: view === "history" },
        { label: "Bookmarks", icon: Star, action: () => onNavigateView("bookmarks"), active: view === "bookmarks" },
        { label: "Reading List", icon: BookMarked, action: () => onNavigateView("readinglist"), active: view === "readinglist" },
        { label: "Notes", icon: FileText, action: () => onNavigateView("notes"), active: view === "notes" },
        { label: "Downloads", icon: Download, action: () => onNavigateView("downloads"), active: view === "downloads" },
      ],
    },
    {
      label: "Workspace",
      items: [
        { label: "Workspaces", icon: Briefcase, action: () => onNavigateView("workspaces"), active: view === "workspaces" },
        { label: "Sessions", icon: HistoryIcon, action: () => onNavigateView("sessions"), active: view === "sessions" },
      ],
    },
    {
      label: "Privacy & Security",
      items: [
        { label: "Private Browsing", icon: EyeOff, action: () => onNavigateView("incognito"), active: view === "incognito" },
        { label: "Privacy Center", icon: ShieldCheck, action: () => onNavigateView("privacy"), active: view === "privacy" },
        { label: "Security Center", icon: Lock, action: () => onNavigateView("security"), active: view === "security" },
        { label: "Nexus Shield", icon: Shield, action: () => onNavigateView("shield"), active: view === "shield" },
        { label: "Fingerprint", icon: Fingerprint, action: () => onNavigateView("fingerprint"), active: view === "fingerprint" },
        { label: "Permissions", icon: Eye, action: () => onNavigateView("permissions"), active: view === "permissions" },
        { label: "Transparency", icon: Eye, action: () => onNavigateView("transparency"), active: view === "transparency" },
        { label: "Privacy Audit", icon: Gauge, action: () => onNavigateView("audit"), active: view === "audit" },
      ],
    },
    {
      label: "Nexus",
      items: [
        { label: "AI Assistant", icon: Sparkles, action: () => onNavigateView("assistant") },
        { label: "NexusVPN", icon: Shield, action: () => onNavigateView("vpn"), active: view === "vpn" },
        { label: "Premium", icon: Crown, action: () => onNavigateView("premium"), active: view === "premium" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Extensions", icon: Puzzle, action: () => onNavigateView("extensions"), active: view === "extensions" },
        { label: "Performance", icon: Gauge, action: () => onNavigateView("performance"), active: view === "performance" },
        { label: "Diagnostics", icon: Activity, action: () => onNavigateView("diagnostics"), active: view === "diagnostics" },
        { label: "Settings", icon: Settings, action: () => onNavigateView("settings"), active: view === "settings" },
      ],
    },
    {
      label: "Power",
      items: [
        { label: "Toolbox", icon: Wrench, action: () => onNavigateView("toolbox"), active: view === "toolbox" },
        { label: "Keyboard", icon: Keyboard, action: () => onNavigateView("keyboard"), active: view === "keyboard" },
        { label: "Nexus Labs", icon: FlaskConical, action: () => onNavigateView("labs"), active: view === "labs" },
      ],
    },
  ];

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-border/40 bg-sidebar transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-primary shadow-[0_0_18px_hsl(var(--accent)/0.4)]">
          <NexusLogo size={20} />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-[0.3em] text-foreground font-display">
            NEXUS
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4 nexus-scroll">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                {group.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ label, icon: Icon, active, action, badge }) => (
                <button
                  key={label}
                  onClick={action}
                  title={label}
                  className={`nx-kbd-focus flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition ${
                    active
                      ? "bg-accent/15 text-accent shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.2)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
                  {!collapsed && badge > 0 && (
                    <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border/40 px-3 py-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (<><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>)}
        </button>
      </div>
    </aside>
  );
}