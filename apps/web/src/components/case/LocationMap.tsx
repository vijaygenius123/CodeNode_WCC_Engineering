import { MapPin } from "lucide-react";
import type { Location } from "../../types";

interface Props {
  location: Location;
  ward: string;
  conservationArea?: string;
  listedBuilding?: boolean;
  listedGrade?: string;
}

export default function LocationMap({
  location,
  ward,
  conservationArea,
  listedBuilding,
  listedGrade,
}: Props) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <MapPin size={18} style={{ color: "var(--govuk-blue)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="govuk-body mb-0">
            <strong>{location.street}</strong>
          </p>
          <p className="text-grey text-small mb-0">{location.postcode}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span className="govuk-tag govuk-tag--grey">Ward: {ward}</span>
        {conservationArea && (
          <span className="govuk-tag govuk-tag--planning">
            Conservation Area: {conservationArea}
          </span>
        )}
        {listedBuilding && (
          <span className="govuk-tag govuk-tag--heritage">
            Listed Building{listedGrade ? ` (${listedGrade})` : ""}
          </span>
        )}
      </div>

      <p className="text-grey text-small mb-0" style={{ marginTop: 8 }}>
        Coordinates: {location.lat.toFixed(5)}, {location.lon.toFixed(5)}
      </p>
    </div>
  );
}
