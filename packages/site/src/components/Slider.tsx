export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  display?: string;
  onChange: (next: number) => void;
}) {
  const shown = display ?? (Number.isInteger(step) ? String(value) : value.toPrecision(3));
  return (
    <label className="slider">
      <span className="slider-row">
        <span>{label}</span>
        <span className="slider-val">
          {shown}
          {unit !== undefined ? <span className="slider-unit">{unit}</span> : null}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
