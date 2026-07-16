const countryNames: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  UK: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  BR: "Brazil",
  MX: "Mexico",
};

export function normalizeCountryCode(value: string) {
  const code = String(value || "").trim().toUpperCase();
  return code === "UK" ? "GB" : code;
}

export function getCountryName(value: string) {
  const code = normalizeCountryCode(value);
  return countryNames[code] || code || "Unknown";
}
