"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiX } from "react-icons/fi";
import type { SongPage } from "@/data/songs";
import { copyText } from "@/lib/copyText";

export function EmbedModal({ song, open, onClose }: { song: SongPage; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const code = `<iframe src="https://go.cyniicalaesthetic.productions/embed/${song.slug}" width="100%" height="500" frameborder="0" title="${song.title} by ${song.artist}"></iframe>`;
  const copy = async () => { if (await copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 1800); } };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="embed-title">
      <button className="modal-close" onClick={onClose} aria-label="Close embed dialog"><FiX /></button>
      <span className="eyebrow">EMBED PLAYER</span>
      <h2 id="embed-title">Take the song with you.</h2>
      <p>Paste this code into your website. The compact player route is included and ready to use.</p>
      <pre><code>{code}</code></pre>
      <button className="copy-code" onClick={copy}>{copied ? <FiCheck /> : <FiCopy />}{copied ? "Copied" : "Copy embed code"}</button>
    </div>
  </div>;
}
