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
  US: { label: "United States", d: "M112 121l18-10 29-4 31 5 18 12-5 15-27 7-36-1-29-9-6-8z" },
  CA: { label: "Canada", d: "M91 65l39-17 47 2 33 12 34-2 23 14-14 19-55 6-56-6-44 8-26-16z" },
  MX: { label: "Mexico", d: "M145 150l31 4 24 15 12 22-18 6-24-16-28-18z" },
  BR: { label: "Brazil", d: "M245 201l26-13 32 12 15 31-8 37-25 27-24-19-15-39z" },
  GB: { label: "United Kingdom", d: "M305 94l13-8 15 6-1 14-13 6-12-6z" },
  DE: { label: "Germany", d: "M345 111l17-5 15 11-3 21-17 7-16-12z" },
  FR: { label: "France", d: "M326 125l24-6 17 16-5 23-22 9-20-17z" },
  AU: { label: "Australia", d: "M492 231l45-10 47 18 19 30-21 30-43 4-45-23-17-28z" },
};

const baseLandMasses = [
  "M73 79l30-27 45-18 48 4 30 14 33-3 36 17-9 18-39 11-22 19 21 18-8 23-42 4-34-12-28 10-37-3-36-23-22-27z",
  "M150 161l35 10 28 25 20 39 28 21 5 33-22 25-30-25-18-41-23-34-28-24z",
  "M292 78l23-18 41 0 41 14 48-7 55 14 48 25 26 38-25 23-53-9-41 12-44-7-33 13-47-20-36 7-27-19 4-33z",
  "M365 159l33-12 49 7 39 22 21 36-12 47-29 34-31-12-20-49-30-28-28-16z",
  "M508 64l55 8 43 26 13 34-29 15-50-9-36-25-22-30z",
  "M482 226l52-13 51 14 31 36-10 33-40 18-55-12-42-29z",
  "M315 99l15-8 17 6-4 16-17 5z",
  "M612 283l14-6 11 8-7 11-15 0z",
];

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
      {baseLandMasses.map((d, index) => <path key={index} d={d} />)}
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
