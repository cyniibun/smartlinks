"use client";
import { useEffect, useState } from "react";

type DebugState = { pixelId: string; loaderRequested: boolean; pageCalled: boolean; lastClick: null | { event: string; properties: Record<string, unknown>; at: string } };

export function TikTokPixelDebug({ pixelId, songTitle }: { pixelId?: string; songTitle: string }) {
  const [state, setState] = useState<DebugState>({ pixelId: pixelId || "Not configured", loaderRequested: false, pageCalled: false, lastClick: null });
  const [ttqExists, setTtqExists] = useState(false);
  useEffect(() => {
    const refresh = () => {
      setTtqExists(Boolean(window.ttq || window.__cyniicalTtq));
      if (window.__cyniicalTikTokDebug) setState({ ...window.__cyniicalTikTokDebug });
    };
    refresh(); const timer = window.setInterval(refresh, 500); window.addEventListener("cyniical:tiktok-debug", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("cyniical:tiktok-debug", refresh); };
  }, []);
  const test = () => {
    const properties = { button_text: "Debug Test", content_name: songTitle };
    const attempted = { event: "ClickButton", properties, at: new Date().toISOString() };
    window.__cyniicalTikTokDebug = { pixelId: pixelId || "Not configured", loaderRequested: state.loaderRequested, pageCalled: state.pageCalled, lastClick: attempted };
    (window.ttq || window.__cyniicalTtq)?.track("ClickButton", properties); window.dispatchEvent(new Event("cyniical:tiktok-debug"));
  };
  return <aside className="pixel-debug" aria-label="TikTok pixel debug panel">
    <div><strong>TikTok Pixel Debug</strong><span className={ttqExists ? "debug-ok" : "debug-bad"}>{ttqExists ? "ttq detected" : "ttq missing"}</span></div>
    <dl><div><dt>Pixel ID</dt><dd>{state.pixelId}</dd></div><div><dt>Loader requested</dt><dd>{state.loaderRequested ? "Yes" : "No"}</dd></div><div><dt>ttq.page() called</dt><dd>{state.pageCalled ? "Yes" : "No"}</dd></div><div><dt>Last click attempted</dt><dd>{state.lastClick ? `${state.lastClick.event} · ${String(state.lastClick.properties.button_text)}` : "None"}</dd></div></dl>
    <button type="button" onClick={test} disabled={!ttqExists}>Fire TikTok Test Event</button>
  </aside>;
}
