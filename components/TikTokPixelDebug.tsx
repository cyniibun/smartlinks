"use client";
import { useEffect, useState } from "react";
import { getTikTokTestCode, withTikTokTestCode } from "@/lib/tracking";

type DebugState = { pixelId: string; loaderRequested: boolean; pageCalled: boolean; lastClick: null | { event: string; properties: Record<string, unknown>; at: string }; testEventCode?: string | null };

export function TikTokPixelDebug({ pixelId, songTitle }: { pixelId?: string; songTitle: string }) {
  const [state, setState] = useState<DebugState>({ pixelId: pixelId || "Not configured", loaderRequested: false, pageCalled: false, lastClick: null });
  const [ttqExists, setTtqExists] = useState(false);
  const [testCodeInput, setTestCodeInput] = useState("");
  useEffect(() => {
    const refresh = () => {
      setTtqExists(Boolean(window.ttq || window.__cyniicalTtq));
      if (window.__cyniicalTikTokDebug) setState({ ...window.__cyniicalTikTokDebug });
    };
    refresh(); setTestCodeInput(getTikTokTestCode() || ""); const timer = window.setInterval(refresh, 500); window.addEventListener("cyniical:tiktok-debug", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("cyniical:tiktok-debug", refresh); };
  }, []);
  const test = () => {
    const properties = withTikTokTestCode({ button_text: "Debug Test", content_name: songTitle });
    const attempted = { event: "ClickButton", properties, at: new Date().toISOString() };
    window.__cyniicalTikTokDebug = { pixelId: pixelId || "Not configured", loaderRequested: state.loaderRequested, pageCalled: state.pageCalled, lastClick: attempted };
    (window.ttq || window.__cyniicalTtq)?.track("ClickButton", properties); window.dispatchEvent(new Event("cyniical:tiktok-debug"));
  };
  const saveTestCode = () => {
    const code = testCodeInput.trim();
    try { if (code) sessionStorage.setItem("cyniical_tiktok_test_code", code); else sessionStorage.removeItem("cyniical_tiktok_test_code"); } catch { /* URL mode still works when storage is unavailable. */ }
    const url = new URL(window.location.href); if (code) url.searchParams.set("tt_test_code", code); else url.searchParams.delete("tt_test_code"); url.searchParams.set("debugPixel", "1"); window.location.assign(url.toString());
  };
  return <aside className="pixel-debug" aria-label="TikTok pixel debug panel">
    <div><strong>TikTok Pixel Debug</strong><span className={ttqExists ? "debug-ok" : "debug-bad"}>{ttqExists ? "ttq detected" : "ttq missing"}</span></div>
    <dl><div><dt>Pixel ID</dt><dd>{state.pixelId}</dd></div><div><dt>Test event code</dt><dd>{testCodeInput || state.testEventCode || "None"}</dd></div><div><dt>Loader requested</dt><dd>{state.loaderRequested ? "Yes" : "No"}</dd></div><div><dt>ttq.page() called</dt><dd>{state.pageCalled ? "Yes" : "No"}</dd></div><div><dt>Last click attempted</dt><dd>{state.lastClick ? `${state.lastClick.event} · ${String(state.lastClick.properties.button_text)}` : "None"}</dd></div><div><dt>Last event test code</dt><dd>{state.lastClick?.properties.test_event_code ? String(state.lastClick.properties.test_event_code) : "None"}</dd></div></dl>
    <div className="pixel-test-code"><input value={testCodeInput} onChange={(event) => setTestCodeInput(event.target.value)} placeholder="TEST65701" aria-label="Temporary TikTok test event code" /><button type="button" onClick={saveTestCode}>Save test code</button></div>
    <button type="button" onClick={test} disabled={!ttqExists}>Fire TikTok Test Event</button>
  </aside>;
}
