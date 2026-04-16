interface Props {
  notes: string;
}

export default function CaseNotes({ notes }: Props) {
  if (!notes)
    return <p className="govuk-body-s text-grey">No case notes recorded.</p>;

  return (
    <p
      className="govuk-body"
      style={{
        whiteSpace: "pre-wrap",
        background: "#fafafa",
        padding: "12px 14px",
        borderRadius: 3,
        border: "1px solid #e8e8e8",
        fontSize: "0.875rem",
        lineHeight: 1.55,
      }}
    >
      {notes}
    </p>
  );
}
