import { CARAT_BANDS } from '../utils/price'

interface CaratSelectorProps {
  selected: string
  onChange: (band: string) => void
}

export default function CaratSelector({ selected, onChange }: CaratSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Carat weight selection">
      {CARAT_BANDS.map(band => (
        <button
          key={band}
          onClick={() => onChange(band)}
          role="radio"
          aria-checked={selected === band}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            selected === band
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {band} ct
        </button>
      ))}
    </div>
  )
}
