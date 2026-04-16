"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CaseListItem } from "../types";

interface Props {
  cases: CaseListItem[];
  height?: number;
  onCaseClick?: (caseId: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#d4351c",
  high: "#f47738",
  standard: "#1d70b8",
};

const DOMAIN_SHAPES: Record<string, "circle" | "square"> = {
  planning: "square",
  street: "circle",
};

const STATUS_OPACITY: Record<string, number> = {
  closed: 0.3,
  resolved: 0.3,
};

export default function CaseMap({ cases, height = 400, onCaseClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Westminster center
    const map = L.map(mapRef.current).setView([51.5130, -0.1500], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    for (const c of cases) {
      if (!c.location.lat || !c.location.lon) continue;

      const color = c.max_severity
        ? (SEVERITY_COLORS[c.max_severity] ?? "#505a5f")
        : "#505a5f";
      const opacity = STATUS_OPACITY[c.status] ?? 0.85;
      const isDomain = DOMAIN_SHAPES[c.domain] ?? "circle";
      const radius = c.max_severity === "critical" ? 10 : c.max_severity === "high" ? 8 : 6;

      let marker: L.CircleMarker | L.Marker;

      if (isDomain === "square") {
        // Planning cases: square marker via divIcon
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${radius * 2}px;height:${radius * 2}px;background:${color};opacity:${opacity};border:2px solid #fff;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [radius * 2, radius * 2],
          iconAnchor: [radius, radius],
        });
        marker = L.marker([c.location.lat, c.location.lon], { icon });
      } else {
        // Street cases: circle marker
        marker = L.circleMarker([c.location.lat, c.location.lon], {
          radius,
          fillColor: color,
          fillOpacity: opacity,
          color: "#fff",
          weight: 2,
        });
      }

      const popup = `
        <div style="font-family:Arial,sans-serif;font-size:13px;min-width:160px">
          <strong>${c.case_id}</strong><br/>
          <span style="color:${color};font-weight:700">${(c.max_severity ?? "none").toUpperCase()}</span>
          &middot; ${c.case_type.replace(/_/g, " ")}<br/>
          <span style="color:#505a5f">${c.location.street}, ${c.location.postcode}</span><br/>
          <span style="color:#505a5f">Flags: ${c.flag_count}</span>
        </div>`;

      marker.bindPopup(popup);

      if (onCaseClick) {
        marker.on("click", () => onCaseClick(c.case_id));
      }

      marker.addTo(map);
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [cases, onCaseClick]);

  return (
    <div>
      <div ref={mapRef} style={{ height, borderRadius: 6, border: "1px solid #d0d0d0" }} />
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: "0.78rem", color: "#505a5f", flexWrap: "wrap" }}>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#d4351c", marginRight: 4, verticalAlign: "middle" }} />Critical</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#f47738", marginRight: 4, verticalAlign: "middle" }} />High</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#1d70b8", marginRight: 4, verticalAlign: "middle" }} />Standard</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#4c2c92", transform: "rotate(45deg)", marginRight: 4, verticalAlign: "middle" }} />Planning</span>
        <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#505a5f", marginRight: 4, verticalAlign: "middle" }} />Street</span>
      </div>
    </div>
  );
}
