type CountryValue = {
  countryCode: string;
  countryName: string;
  value: number;
};

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

const highlightShapes: Record<string, { d: string; label: string }> = {
  US: { label: "United States", d: "M133 122c27-14 65-14 91-2 8 4 8 17-1 22-28 15-69 13-95-4-7-5-5-12 5-16Z" },
  CA: { label: "Canada", d: "M118 74c43-22 95-21 132-4 15 7 11 24-7 28-42 10-93 8-132-8-14-6-8-12 7-16Z" },
  MX: { label: "Mexico", d: "M177 161c23-1 44 8 55 25 8 13 1 25-14 22-25-5-43-23-51-39-3-6 2-8 10-8Z" },
  BR: { label: "Brazil", d: "M283 213c33-7 61 16 62 47 1 26-28 47-50 31-20-14-39-65-12-78Z" },
  GB: { label: "United Kingdom", d: "M314 100c13-8 25-4 28 8 3 11-8 21-22 17-12-3-19-18-6-25Z" },
  DE: { label: "Germany", d: "M357 112c17-7 32 5 29 22-3 15-22 18-33 7-9-9-8-24 4-29Z" },
  FR: { label: "France", d: "M335 138c20-8 38 5 38 24 0 16-18 27-35 18-15-8-18-34-3-42Z" },
  AU: { label: "Australia", d: "M500 233c42-7 78 12 83 42 5 25-28 38-64 25-32-12-57-59-19-67Z" },
};

function normalizeCountryCode(value: string) {
  const code = String(value || "").trim().toUpperCase();
  if (code === "UK") return "GB";
  return code;
}

export function getCountryName(value: string) {
  const code = normalizeCountryCode(value);
  return countryNames[code] || code || "Unknown";
}

export function WorldHeatMap({ countries }: { countries: CountryValue[] }) {
  const normalized = countries.map((item) => ({ ...item, countryCode: normalizeCountryCode(item.countryCode) }));
  const max = Math.max(...normalized.map((item) => item.value), 1);
  const byCode = new Map(normalized.map((item) => [item.countryCode, item]));

  return <svg className="world-heat-map" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="world-heat-map-title">
    <title id="world-heat-map-title">World map showing countries with analytics data</title>
    <g className="map-base">
      <path d="M92 98c37-39 111-47 160-23 34 17 27 56-7 78-43 28-103 17-139-13-19-16-27-29-14-42Z" />
      <path d="M171 181c36-5 71 14 84 44 15 35-8 79-43 83-29 3-58-39-62-77-2-22 3-47 21-50Z" />
      <path d="M298 87c76-35 165-31 235 5 32 17 27 52-11 68-62 27-133-4-192 17-46 16-85-59-32-90Z" />
      <path d="M381 169c55-10 128-1 160 33 31 33 8 76-44 75-43-1-67-39-107-47-42-8-61-51-9-61Z" />
      <path d="M475 64c48-18 102-2 125 31 19 28-14 52-58 43-40-8-99-48-67-74Z" />
      <path d="M448 236c46-10 96 12 117 48 18 30-18 50-62 35-43-15-93-70-55-83Z" />
    </g>
    <g className="map-highlights">
      {Object.entries(highlightShapes).map(([code, shape]) => {
        const value = byCode.get(code)?.value || 0;
        if (!value) return null;
        const opacity = 0.28 + value / max * 0.62;
        return <path key={code} d={shape.d} fill={`rgba(255,79,147,${opacity.toFixed(2)})`} stroke="rgba(255,153,196,.38)">
          <title>{`${shape.label}: ${value}`}</title>
        </path>;
      })}
    </g>
  </svg>;
}
