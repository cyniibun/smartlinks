export type ThemeSettings = {
  backgroundStyle: "minimal_dark" | "neon" | "luxury" | "editorial" | "podcast" | "glass" | "monochrome";
  gradientPreset: "radial_top_right" | "radial_top_left" | "radial_bottom_right" | "radial_bottom_left" | "center_glow" | "dual_glow" | "vertical_wash" | "horizontal_wash" | "diagonal_sweep" | "subtle_vignette" | "flat";
  backgroundIntensity: "subtle" | "medium" | "strong";
  artworkSize: "compact" | "standard" | "large";
  heroLayout: "large_artwork" | "compact_horizontal" | "minimal_text" | "artwork_left" | "artwork_top";
  mobileHeroLayout: "inherit" | "compact_horizontal" | "minimal_text" | "artwork_left";
  cardRadius: "soft" | "rounded" | "pill";
  buttonStyle: "glass" | "solid" | "outline";
  typographyScale: "compact" | "standard" | "large";
  accentColor: string;
  secondaryAccentColor: string;
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
  gradientPreset: "radial_top_right",
  backgroundIntensity: "medium",
  artworkSize: "standard",
  heroLayout: "large_artwork",
  mobileHeroLayout: "compact_horizontal",
  cardRadius: "rounded",
  buttonStyle: "glass",
  typographyScale: "standard",
  accentColor: "#df5d93",
  secondaryAccentColor: "#4dcfff",
  buttonTextColor: "#f7f3f5",
  buttonBackgroundColor: "rgba(255,255,255,.055)",
  buttonBorderColor: "rgba(255,255,255,.1)",
  mutedTextColor: "#aaa8ad",
  autoButtonContrast: true,
  layoutDensity: "standard",
  footerVisible: true,
  blurIntensity: "strong",
};

export const toneLinkTheme: ThemeSettings = {
  ...minimalDarkTheme,
  backgroundStyle: "minimal_dark",
  gradientPreset: "radial_top_right",
  backgroundIntensity: "medium",
  accentColor: "#ff4f93",
  secondaryAccentColor: "#ff7bb2",
  buttonTextColor: "#ffffff",
  buttonBackgroundColor: "#ff4f93",
  buttonBorderColor: "#ff4f93",
  mutedTextColor: "#a8a1a8",
  buttonStyle: "glass",
  autoButtonContrast: true,
};

export const systemThemes: ThemeRecord[] = [
  { id: "tonelink", name: "ToneLink", description: "Default dashboard display theme for ToneLink workspaces.", is_system_theme: true, settings: toneLinkTheme },
  { id: "minimal-dark", name: "Minimal Dark", description: "Premium dark default for music links.", is_system_theme: true, settings: minimalDarkTheme },
  { id: "neon", name: "Neon", description: "High contrast glow with saturated accent.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "neon", gradientPreset: "dual_glow", accentColor: "#77f7ff", secondaryAccentColor: "#df5d93", buttonStyle: "outline", typographyScale: "large", backgroundIntensity: "strong" } },
  { id: "luxury", name: "Luxury", description: "Warm, polished, spacious presentation.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "luxury", gradientPreset: "radial_top_right", accentColor: "#d8b46a", secondaryAccentColor: "#7d4b22", layoutDensity: "spacious", cardRadius: "soft" } },
  { id: "editorial", name: "Editorial", description: "Clean type-first layout for campaigns.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "editorial", gradientPreset: "vertical_wash", accentColor: "#f4f0e9", secondaryAccentColor: "#6f6a70", blurIntensity: "soft", buttonStyle: "solid", backgroundIntensity: "subtle" } },
  { id: "podcast", name: "Podcast", description: "Comfortable dense layout for episodic pages.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "podcast", gradientPreset: "center_glow", accentColor: "#8f7cff", secondaryAccentColor: "#df5d93", artworkSize: "compact", layoutDensity: "compact" } },
  { id: "glass", name: "Glass", description: "Album-art blur and glassmorphism.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "glass", gradientPreset: "diagonal_sweep", accentColor: "#ef85b1", secondaryAccentColor: "#77f7ff", buttonStyle: "glass", blurIntensity: "strong" } },
  { id: "monochrome", name: "Monochrome", description: "Black, white, and minimal contrast.", is_system_theme: true, settings: { ...minimalDarkTheme, backgroundStyle: "monochrome", gradientPreset: "subtle_vignette", accentColor: "#ffffff", secondaryAccentColor: "#777777", buttonStyle: "outline", blurIntensity: "none", backgroundIntensity: "subtle" } },
];

export function resolveThemeSettings(value: unknown): ThemeSettings {
  const input = typeof value === "object" && value ? value as Partial<ThemeSettings> : {};
  return {
    ...minimalDarkTheme,
    ...input,
    gradientPreset: typeof input.gradientPreset === "string" ? input.gradientPreset : minimalDarkTheme.gradientPreset,
    backgroundIntensity: typeof input.backgroundIntensity === "string" ? input.backgroundIntensity : minimalDarkTheme.backgroundIntensity,
    heroLayout: typeof input.heroLayout === "string" ? input.heroLayout : minimalDarkTheme.heroLayout,
    mobileHeroLayout: typeof input.mobileHeroLayout === "string" ? input.mobileHeroLayout : minimalDarkTheme.mobileHeroLayout,
    accentColor: typeof input.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(input.accentColor) ? input.accentColor : minimalDarkTheme.accentColor,
    secondaryAccentColor: typeof input.secondaryAccentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(input.secondaryAccentColor) ? input.secondaryAccentColor : minimalDarkTheme.secondaryAccentColor,
    buttonTextColor: typeof input.buttonTextColor === "string" ? input.buttonTextColor : minimalDarkTheme.buttonTextColor,
    buttonBackgroundColor: typeof input.buttonBackgroundColor === "string" ? input.buttonBackgroundColor : minimalDarkTheme.buttonBackgroundColor,
    buttonBorderColor: typeof input.buttonBorderColor === "string" ? input.buttonBorderColor : minimalDarkTheme.buttonBorderColor,
    mutedTextColor: typeof input.mutedTextColor === "string" ? input.mutedTextColor : minimalDarkTheme.mutedTextColor,
    autoButtonContrast: input.autoButtonContrast !== false,
  };
}

type CssVars = Record<string, string>;
function hexToRgb(hexColor: string) {
  const hex = hexColor.match(/^#([0-9a-fA-F]{6})$/)?.[1];
  if (!hex) return [223, 93, 147] as const;
  return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)] as const;
}
function rgba(hexColor: string, alpha: number) {
  const [r,g,b]=hexToRgb(hexColor);
  return `rgba(${r},${g},${b},${alpha})`;
}
function themeGradient(settings: ThemeSettings) {
  const alpha = settings.backgroundIntensity === "strong" ? 0.34 : settings.backgroundIntensity === "subtle" ? 0.14 : 0.23;
  const accent = rgba(settings.accentColor, alpha);
  const secondary = rgba(settings.secondaryAccentColor, Math.max(alpha - 0.04, 0.1));
  const base = "linear-gradient(120deg,rgba(3,3,4,.78),rgba(4,4,6,.95) 72%)";
  switch (settings.gradientPreset) {
    case "radial_top_left": return `radial-gradient(circle at 18% 12%,${accent},transparent 34%),${base}`;
    case "radial_bottom_right": return `radial-gradient(circle at 82% 88%,${accent},transparent 34%),${base}`;
    case "radial_bottom_left": return `radial-gradient(circle at 18% 88%,${accent},transparent 34%),${base}`;
    case "center_glow": return `radial-gradient(circle at 50% 46%,${accent},transparent 42%),${base}`;
    case "dual_glow": return `radial-gradient(circle at 18% 14%,${accent},transparent 32%),radial-gradient(circle at 82% 20%,${secondary},transparent 38%),${base}`;
    case "vertical_wash": return `linear-gradient(180deg,${accent},transparent 38%),${base}`;
    case "horizontal_wash": return `linear-gradient(90deg,${accent},transparent 42%,${secondary}),${base}`;
    case "diagonal_sweep": return `linear-gradient(135deg,${accent},transparent 44%,${secondary}),${base}`;
    case "subtle_vignette": return `radial-gradient(circle at 50% 35%,rgba(255,255,255,.08),transparent 36%),radial-gradient(circle at 50% 50%,transparent 35%,rgba(0,0,0,.55) 100%),${base}`;
    case "flat": return "linear-gradient(120deg,rgba(3,3,4,.88),rgba(4,4,6,.96))";
    case "radial_top_right":
    default: return `radial-gradient(circle at 78% 12%,${accent},transparent 34%),${base}`;
  }
}
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
    "--theme-secondary-accent": settings.secondaryAccentColor,
    "--theme-background-gradient": themeGradient(settings),
    "--theme-button-text": settings.autoButtonContrast ? readableTextColor(buttonBackground || settings.accentColor) : settings.buttonTextColor,
    "--theme-button-bg": buttonBackground || "rgba(255,255,255,.055)",
    "--theme-button-border": settings.buttonBorderColor || "rgba(255,255,255,.1)",
    "--theme-muted": settings.mutedTextColor,
    "--theme-radius": settings.cardRadius === "pill" ? "34px" : settings.cardRadius === "soft" ? "18px" : "30px",
    "--theme-button-radius": settings.cardRadius === "pill" ? "999px" : "15px",
    "--theme-blur": settings.blurIntensity === "none" ? "0px" : settings.blurIntensity === "soft" ? "36px" : "90px",
  };
}

export function isSafeHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeHex(value: unknown, fallback: string) {
  if (!isSafeHexColor(value)) return fallback;
  const hex = value.trim();
  if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  return hex.toLowerCase();
}

export function dashboardThemeCssVars(settings?: Partial<ThemeSettings> | null): CssVars {
  const accent = normalizeHex(settings?.accentColor, toneLinkTheme.accentColor);
  const secondary = normalizeHex(settings?.secondaryAccentColor, toneLinkTheme.secondaryAccentColor);
  return {
    "--tl-accent": accent,
    "--tl-accent-soft": rgba(accent, 0.22),
    "--tl-accent-muted": rgba(accent, 0.1),
    "--tl-focus": rgba(accent, 0.42),
    "--tl-chart-primary": accent,
    "--tl-pink": accent,
    "--tl-pink-2": secondary,
    "--tl-line-hot": rgba(accent, 0.42),
    "--pink": accent,
  };
}
