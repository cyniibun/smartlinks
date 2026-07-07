"use client";

import { minimalDarkTheme, type ThemeRecord, type ThemeSettings } from "@/lib/themes";

export function ThemeSample({ theme, settings }: { theme: Pick<ThemeRecord, "name" | "description"> & { settings?: ThemeSettings }; settings?: ThemeSettings }) {
  settings ||= theme.settings || minimalDarkTheme;
  return <div className={`theme-sample theme-${settings.backgroundStyle}`} style={{"--theme-accent":settings.accentColor,"--theme-radius":settings.cardRadius==="pill"?"28px":settings.cardRadius==="soft"?"16px":"22px"} as Record<string,string>}>
    <div className="theme-sample-card"><div className="theme-sample-art"/><div><strong>{theme.name}</strong><span>{theme.description || "Sample smart-link page"}</span></div></div>
    <div className={`theme-sample-button button-${settings.buttonStyle}`}>Spotify</div><div className={`theme-sample-button button-${settings.buttonStyle}`}>Apple Music</div>
    {settings.footerVisible&&<small>Powered by ToneLink</small>}
  </div>;
}

export function ThemeDetails({ theme }: { theme: ThemeRecord }) {
  return <div className="theme-details"><ThemeSample theme={theme}/><dl><div><dt>Accent</dt><dd>{theme.settings.accentColor}</dd></div><div><dt>Buttons</dt><dd>{theme.settings.buttonStyle}</dd></div><div><dt>Density</dt><dd>{theme.settings.layoutDensity}</dd></div><div><dt>Footer</dt><dd>{theme.settings.footerVisible ? "Visible" : "Hidden"}</dd></div></dl></div>;
}
