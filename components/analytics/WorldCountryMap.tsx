"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { getCountryName, normalizeCountryCode } from "@/lib/countries";

type CountryValue = {
  countryCode: string;
  countryName: string;
  value: number;
};

const TOPOLOGY_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const numericToIso2: Record<string, string> = {
  "036": "AU",
  "076": "BR",
  "124": "CA",
  "250": "FR",
  "276": "DE",
  "484": "MX",
  "826": "GB",
  "840": "US",
};

function getGeoIso2(geography: Record<string, any>) {
  const properties = geography.properties || {};
  const iso2 = properties.ISO_A2 || properties.iso_a2 || properties.ISO2 || properties.iso2;
  if (typeof iso2 === "string" && iso2 !== "-99") return normalizeCountryCode(iso2);
  const id = String(geography.id || properties.id || "").padStart(3, "0");
  return numericToIso2[id] || "";
}

function getCountryOpacity(value: number, max: number) {
  if (!value) return undefined;
  return 0.35 + value / Math.max(max, 1) * 0.65;
}

export function WorldCountryMap({ countries }: { countries: CountryValue[] }) {
  const [tooltip, setTooltip] = useState<{ name: string; value: number; x: number; y: number } | null>(null);
  const countryValueByCode = useMemo(() => new Map(countries.map((country) => [normalizeCountryCode(country.countryCode), country])), [countries]);
  const max = Math.max(...countries.map((country) => country.value), 1);

  return <div className="world-country-map" onMouseLeave={() => setTooltip(null)}>
    <ComposableMap projection="geoNaturalEarth1" projectionConfig={{ scale: 150 }} role="img" aria-label="World map showing countries with analytics data">
      <Geographies geography={TOPOLOGY_URL}>
        {({ geographies }) => geographies.map((geo) => {
          const iso2 = getGeoIso2(geo);
          const metric = iso2 ? countryValueByCode.get(iso2) : undefined;
          const value = metric?.value || 0;
          const opacity = getCountryOpacity(value, max);
          const name = metric?.countryName || getCountryName(iso2);
          return <Geography
            key={geo.rsmKey || geo.id}
            geography={geo}
            // Map colors are restricted to validated dashboard CSS variables. Do not pass raw user theme values into SVG/D3 props.
            fill={value ? "var(--tl-map-highlight)" : "var(--tl-map-base)"}
            stroke="var(--tl-map-border)"
            strokeWidth={0.35}
            opacity={opacity}
            tabIndex={value ? 0 : -1}
            aria-label={value ? `${name}: ${value} views` : undefined}
            className={value ? "has-data" : "no-data"}
            onMouseMove={(event) => value && setTooltip({ name, value, x: event.clientX, y: event.clientY })}
            onMouseLeave={() => setTooltip(null)}
            onFocus={() => value && setTooltip({ name, value, x: 0, y: 0 })}
            onBlur={() => setTooltip(null)}
          />;
        })}
      </Geographies>
    </ComposableMap>
    {tooltip && <div className="map-tooltip" style={tooltip.x ? { left: tooltip.x, top: tooltip.y } : undefined} role="tooltip">
      <strong>{tooltip.name}</strong>
      <span>{tooltip.value} views</span>
    </div>}
  </div>;
}
