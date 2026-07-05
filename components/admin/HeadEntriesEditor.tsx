"use client";
import type { HeadEntry } from "@/data/songs";

const newEntry = (type: HeadEntry["type"]): HeadEntry => ({
  id: `head-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: type === "meta" ? "Verification meta tag" : type === "external_script" ? "External platform script" : "Inline platform code",
  type, enabled: true, metaAttribute: "name", metaKey: "", content: "", scriptUrl: "", inlineCode: ""
});

export function HeadEntriesEditor({ entries, onChange }: { entries: HeadEntry[]; onChange: (entries: HeadEntry[]) => void }) {
  const update = (index: number, patch: Partial<HeadEntry>) => onChange(entries.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
  return <section className="admin-panel head-panel">
    <div className="panel-title"><div><h2>Safe page header</h2><p>Add platform verification tags or scripts requested for this campaign.</p></div><div className="head-add-actions"><button className="admin-secondary" onClick={() => onChange([...entries, newEntry("meta")])}>+ Meta tag</button><button className="admin-secondary" onClick={() => onChange([...entries, newEntry("external_script")])}>+ Script URL</button><button className="admin-secondary" onClick={() => onChange([...entries, newEntry("inline_script")])}>+ Inline JS</button></div></div>
    <div className="safety-note"><strong>Guardrails active.</strong> HTTPS is required for external scripts. Inline code is syntax-checked, isolated with error handling, and blocked from destructive page, cookie, redirect, and dynamic-eval APIs.</div>
    <div className="head-entry-list">{entries.map((entry, index) => <article className="head-entry" key={entry.id}>
      <div className="head-entry-top"><label>Label<input value={entry.label} onChange={(e) => update(index, { label: e.target.value })} /></label><label className="toggle"><input type="checkbox" checked={entry.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} /> Enabled</label><button className="danger" onClick={() => onChange(entries.filter((_, i) => i !== index))}>Remove</button></div>
      {entry.type === "meta" && <div className="head-entry-fields"><label>Attribute<select value={entry.metaAttribute || "name"} onChange={(e) => update(index, { metaAttribute: e.target.value as "name" | "property" })}><option value="name">name</option><option value="property">property</option></select></label><label>Meta name / property<input value={entry.metaKey || ""} onChange={(e) => update(index, { metaKey: e.target.value })} placeholder="facebook-domain-verification" /></label><label>Content<input value={entry.content || ""} onChange={(e) => update(index, { content: e.target.value })} placeholder="Verification value" /></label></div>}
      {entry.type === "external_script" && <label>HTTPS script URL<input value={entry.scriptUrl || ""} onChange={(e) => update(index, { scriptUrl: e.target.value })} placeholder="https://platform.example/pixel.js" /></label>}
      {entry.type === "inline_script" && <label>Inline JavaScript<textarea value={entry.inlineCode || ""} onChange={(e) => update(index, { inlineCode: e.target.value })} placeholder="Paste the JavaScript inside the platform's script tag—do not include <script> tags." spellCheck={false} /></label>}
    </article>)}</div>
    {!entries.length && <p className="muted">No custom header entries. Most campaigns only need the pixel IDs above.</p>}
  </section>;
}
