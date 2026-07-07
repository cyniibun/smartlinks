"use client";

import { minimalDarkTheme, type ThemeRecord, type ThemeSettings } from "@/lib/themes";
import { themeCssVars } from "@/lib/themes";

export function PublicLinkPreviewFrame({ theme, settings, showHeader = true, showFooter = true }: { theme: Pick<ThemeRecord, "name" | "description"> & { settings?: ThemeSettings }; settings?: ThemeSettings; showHeader?: boolean; showFooter?: boolean }) {
  settings ||= theme.settings || minimalDarkTheme;
  return <div className={`preview-frame smart-link-shell theme-${settings.backgroundStyle} density-${settings.layoutDensity} buttons-${settings.buttonStyle} artwork-${settings.artworkSize} type-${settings.typographyScale}`} style={themeCssVars(settings)}>
    <div className="background-wash" aria-hidden="true" />
    {showHeader&&<header className="public-brand-header"><a href="https://tone-link.com">tone-link</a></header>}
    <div className="content-wrap"><section className="hero-card"><div className="artwork-wrap preview-artwork"/><div className="hero-info"><div><h1>{theme.name}</h1><p>Sample Artist</p></div></div></section><section className="link-section"><div className="section-heading"><span>Choose your destination</span><h2>Listen</h2></div><div className="platform-grid"><button className="platform-button platform-spotify"><span className="platform-icon">♬</span><span className="platform-label">Spotify</span></button><button className="platform-button platform-apple_music"><span className="platform-icon"></span><span className="platform-label">Apple Music</span></button></div></section>{settings.footerVisible&&showFooter&&<footer><span className="powered-by">Powered by</span><a href="https://tone-link.com">tone-link</a></footer>}</div>
  </div>;
}

export const ThemeSample = PublicLinkPreviewFrame;

export function ThemeDetails({ theme }: { theme: ThemeRecord }) {
  return <div className="theme-details"><PublicLinkPreviewFrame theme={theme}/><dl><div><dt>Accent</dt><dd>{theme.settings.accentColor}</dd></div><div><dt>Buttons</dt><dd>{theme.settings.buttonStyle}</dd></div><div><dt>Density</dt><dd>{theme.settings.layoutDensity}</dd></div><div><dt>Footer</dt><dd>{theme.settings.footerVisible ? "Visible" : "Hidden"}</dd></div></dl></div>;
}
