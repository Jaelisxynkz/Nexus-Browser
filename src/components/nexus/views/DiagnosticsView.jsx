import React, { useState } from "react";
import NexusServices from "../services";
import { Activity, CheckCircle2, XCircle, Loader2, Play } from "lucide-react";

function Row({ label, ok, detail }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <span className="text-[13px] text-white/80">{label}</span>
      <span className={`flex items-center gap-2 text-[12px] ${ok ? "text-emerald-400" : "text-red-400"}`}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {detail}
      </span>
    </div>
  );
}

export default function DiagnosticsView() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const runDiagnostics = async () => {
    setRunning(true);
    setResult(null);
    const client = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cores: navigator.hardwareConcurrency || null,
      memoryGB: navigator.deviceMemory || null,
      online: navigator.onLine,
      screen: `${window.screen.width}x${window.screen.height}`,
    };
    try {
      const server = await NexusServices.diagnostics();
      setResult({ server, client });
    } catch (e) {
      setResult({ error: e.message, client });
    }
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center gap-3">
        <Activity className="h-7 w-7 text-[#60a5fa]" />
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Diagnostics</h1>
      </div>
      <p className="mt-1 text-sm text-white/50">Run real checks against the Nexus services and this runtime.</p>

      <button onClick={runDiagnostics} disabled={running}
        className="mt-6 flex items-center gap-2 rounded-xl bg-[#3b82f6] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2f6fe0] disabled:opacity-50">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Run Full Diagnostics
      </button>

      {result && (
        <div className="mt-6 space-y-2">
          {result.error && <Row label="Diagnostics service" ok={false} detail={result.error} />}
          {result.server && (
            <>
              <Row label="Database" ok={result.server.checks.database.ok} detail={result.server.checks.database.ok ? `${result.server.checks.database.latencyMs} ms` : "error"} />
              <Row label="Authentication" ok={result.server.checks.auth.ok} detail={result.server.checks.auth.ok ? result.server.checks.auth.role : "error"} />
              <Row label="Nexus Assistant" ok={result.server.checks.assistant.ok} detail={result.server.checks.assistant.ok ? `${result.server.checks.assistant.latencyMs} ms` : "error"} />
              <Row label="Premium service" ok={result.server.checks.premium.ok} detail={result.server.checks.premium.plan} />
              <Row label="Native runtime" ok={result.server.checks.nativeRuntime.ok} detail="unavailable (web)" />
              <div className="pt-2 text-[11px] text-white/35">Completed in {result.server.durationMs} ms · {new Date(result.server.timestamp).toLocaleString()}</div>
            </>
          )}
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">Client runtime</div>
            <div className="space-y-1 font-mono text-[11px] text-white/60">
              <div>Platform: {result.client.platform} · {result.client.language}</div>
              <div>CPU cores: {result.client.cores ?? "unknown"} · RAM: {result.client.memoryGB ? `~${result.client.memoryGB} GB` : "unknown"}</div>
              <div>Screen: {result.client.screen} · Online: {String(result.client.online)}</div>
              <div className="break-all">UA: {result.client.userAgent}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}