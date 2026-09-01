export function Claim({
  symbol,
  value,
  unit,
  note,
}: {
  symbol: string;
  value: string;
  unit?: string | undefined;
  note?: string;
}) {
  return (
    <div className="claim">
      <span className="claim-sym">{symbol}</span>
      <span className="claim-val">
        {value}
        {unit !== undefined ? <span className="claim-unit">{unit}</span> : null}
      </span>
      {note !== undefined ? <span className="claim-note">{note}</span> : null}
    </div>
  );
}
