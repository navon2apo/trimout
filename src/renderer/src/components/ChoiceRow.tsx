// A labelled row of mutually exclusive choice buttons, used by the export and settings screens.
export interface ChoiceOption<T> { value: T, label: string, title?: string }

export default function ChoiceRow<T extends string>({ label, value, options, onChange }: {
  label: string,
  value: T,
  options: ChoiceOption<T>[],
  onChange: (next: T) => void,
}) {
  return (
    <div className="export-option-row">
      <div className="export-option-label">{label}</div>
      <div className="export-option-choices" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={option.value === value}
            className={option.value === value ? 'export-option-choice active' : 'export-option-choice'}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
