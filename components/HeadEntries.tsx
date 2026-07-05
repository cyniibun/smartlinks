import Script from "next/script";
import type { HeadEntry } from "@/data/songs";

export function HeadEntries({ entries = [] }: { entries?: HeadEntry[] }) {
  return <>{entries.filter((entry) => entry.enabled).map((entry) => {
    if (entry.type === "meta" && entry.metaKey && entry.content) {
      return entry.metaAttribute === "property"
        ? <meta key={entry.id} property={entry.metaKey} content={entry.content} />
        : <meta key={entry.id} name={entry.metaKey} content={entry.content} />;
    }
    if (entry.type === "external_script" && entry.scriptUrl) return <Script key={entry.id} id={`custom-${entry.id}`} src={entry.scriptUrl} strategy="afterInteractive" />;
    if (entry.type === "inline_script" && entry.inlineCode) return <Script key={entry.id} id={`custom-${entry.id}`} strategy="afterInteractive">{`try{(()=>{${entry.inlineCode}\n})()}catch(error){console.error(${JSON.stringify(`[Cyniical header: ${entry.label}]`)},error)}`}</Script>;
    return null;
  })}</>;
}
