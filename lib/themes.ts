export type ThemeSettings = {
  backgroundStyle: "minimal_dark" | "neon" | "luxury" | "editorial" | "podcast" | "glass" | "monochrome";
  artworkSize: "compact" | "standard" | "large";
  cardRadius: "soft" | "rounded" | "pill";
  buttonStyle: "glass" | "solid" | "outline";
  typographyScale: "compact" | "standard" | "large";
  accentColor: string;
  buttonTextColor: string;
  buttonBackgroundColor: string;
  buttonBorderColor: string;
  mutedTextColor: string;
  autoButtonContrast: boolean;
  layoutDensity: "compact" | "standard" | "spacious";
  footerVisible: boolean;
  blurIntensity: "none" | "soft" | "strong";
};

export type ThemeRecord = {
  id: string;
  name: string;
  description?: string;
  is_system_theme: boolean;
  settings: ThemeSettings;
};

export const minimalDarkTheme: ThemeSettings = {
  backgroundStyle: "minimal_dark",
  artworkSize: "standard",
  cardRadius: "rounded",
  buttonStyle: "glass",
  typographyScale: "standard",
  accentColor: "#df5d93",
  buttonTextColor: "#f7f3f5",
  buttonBackgroundColor: "rgba(255,255,255,.055)",
  buttonBorderColor: "rgba(255,255,255,.1)",
  mutedTextColor: "#aaa8ad",
  autoButtonContrast: true,
  layoutDensity: "standard",
  footerVisible: true,
  blurIntensity: "strong",
};

export const systemThemes: ThemeRecord[] = [
  { id: "minimal-dark", name: "Minimal Dark", description: "Premium dark default for music links.", is_system_theme: true, settings: minimalDarkTheme },
  { id: "neon", name: "Neon", description: "High contrast glow with saturated accent.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "neon", accentColor: "#77f7ff", buttonStyle: "outline", typographyScale: "large" } },
  { id: "luxury", name: "Luxury", description: "Warm, polished, spacious presentation.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "luxury", accentColor: "#d8b46a", layoutDensity: "spacious", cardRadius: "soft" } },
  { id: "editorial", name: "Editorial", description: "Clean type-first layout for campaigns.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "editorial", accentColor: "#f4f0e9", blurIntensity: "soft", buttonStyle: "solid" } },
  { id: "podcast", name: "Podcast", description: "Comfortable dense layout for episodic pages.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "podcast", accentColor: "#8f7cff", artworkSize: "compact", layoutDensity: "compact" } },
  { id: "glass", name: "Glass", description: "Album-art blur and glassmorphism.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "glass", accentColor: "#ef85b1", buttonStyle: "glass", blurIntensity: "strong" } },
  { id: "monochrome", name: "Monochrome", description: "Black, white, and minimal contrast.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "monochrome", accentColor: "#ffffff", buttonStyle: "outline", blurIntensity: "none" } },
];

export function resolveThemeSettings(value: unknown): ThemeSettings {
  const input = typeof value === "object" && value ? value as Partial<ThemeSettings> : {};
  return {
    ...minimalDarkTheme,
    ...input,
    accentColor: typeof input.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(input.accentColor) ? input.accentColor : minimalDarkTheme.accentColor,
    buttonTextColor: typeof input.buttonTextColor === "string" ? input.buttonTextColor : minimalDarkTheme.buttonTextColor,
    buttonBackgroundColor: typeof input.buttonBackgroundColor === "string" ? input.buttonBackgroundColor : minimalDarkTheme.buttonBackgroundColor,
    buttonBorderColor: typeof input.buttonBorderColor === "string" ? input.buttonBorderColor : minimalDarkTheme.buttonBorderColor,
    mutedTextColor: typeof input.mutedTextColor === "string" ? input.mutedTextColor : minimalDarkTheme.mutedTextColor,
    autoButtonContrast: input.autoButtonContrast !== false,
  };
}

type CssVars = Record<string, string>;
function readableTextColor(background: string) {
  const hex = background.match(/^#([0-9a-fA-F]{6})$/)?.[1];
  if (!hex) return "#f7f3f5";
  const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
  const luminance=(0.2126*r+0.7152*g+0.0722*b)/255;
  return luminance > 0.55 ? "#08080a" : "#ffffff";
}
export function themeCssVars(settings: ThemeSettings): CssVars {
  const buttonBackground = settings.buttonStyle === "solid" ? settings.buttonBackgroundColor || settings.accentColor : settings.buttonBackgroundColor;
  return {
    "--theme-accent": settings.accentColor,
    "--theme-button-text": settings.autoButtonContrast ? readableTextColor(buttonBackground || settings.accentColor) : settings.buttonTextColor,
    "--theme-button-bg": buttonBackground || "rgba(255,255,255,.055)",
    "--theme-button-border": settings.buttonBorderColor || "rgba(255,255,255,.1)",
    "--theme-muted": settings.mutedTextColor,
    "--theme-radius": settings.cardRadius === "pill" ? "34px" : settings.cardRadius === "soft" ? "18px" : "30px",
    "--theme-button-radius": settings.cardRadius === "pill" ? "999px" : "15px",
    "--theme-blur": settings.blurIntensity === "none" ? "0px" : settings.blurIntensity === "soft" ? "36px" : "90px",
  };
}
