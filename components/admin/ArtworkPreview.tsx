"use client";
import { useEffect, useState } from "react";
export function ArtworkPreview({ url, title = "Artwork preview" }: { url?: string; title?: string }) {
  const [failed, setFailed] = useState(false); useEffect(() => setFailed(false), [url]);
  return <div className="artwork-preview">{url && !failed ? <img src={url} alt={title} onError={() => setFailed(true)} /> : <div className="artwork-fallback" aria-label="No valid artwork">♪</div>}<div><strong>{title}</strong>{!url && <p>Paste or import an image URL to preview artwork.</p>}{url && failed && <p className="form-error">This image could not be loaded. Check the URL or use another image.</p>}</div></div>;
}
