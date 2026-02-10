import { useState, useMemo } from 'react'
import type { MatrixData } from '../api/openfacet'
import { interpolatePrice, getMatrixPrice, formatUSD, CARAT_BANDS, COLORS, CLARITIES } from '../utils/price'

interface PriceCalculatorProps {
  matrix: MatrixData
}

export default function PriceCalculator({ matrix }: PriceCalculatorProps) {
  const [carat, setCarat] = useState('1.00')
  const [color, setColor] = useState('G')
  const [clarity, setClarity] = useState('VS2')

  const caratNum = parseFloat(carat) || 0

  const result = useMemo(() => {
    if (caratNum <= 0) return null
    return interpolatePrice(matrix, caratNum, color, clarity)
  }, [matrix, caratNum, color, clarity])

  const nearestBands = useMemo(() => {
    return CARAT_BANDS.map(band => ({
      band,
      price: getMatrixPrice(matrix, band, color, clarity),
    })).filter(b => b.price != null)
  }, [matrix, color, clarity])

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Price Calculator</h2>
      <p className="text-sm text-gray-500">
        Estimate diamond price by interpolating between carat bands
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Carat weight</label>
          <input
            type="number"
            min="0.1"
            max="10"
            step="0.01"
            value={carat}
            onChange={e => setCarat(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <select
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clarity</label>
          <select
            value={clarity}
            onChange={e => setClarity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {CLARITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {result && (
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Price per carat</div>
              <div className="text-2xl font-bold text-gray-900">{formatUSD(result.pricePerCarat)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total price ({caratNum} ct)</div>
              <div className="text-2xl font-bold text-blue-700">{formatUSD(result.totalPrice)}</div>
            </div>
          </div>
          {result.lowerBand !== result.upperBand && (
            <div className="mt-3 text-xs text-gray-500">
              Interpolated between {result.lowerBand}ct ({formatUSD(result.lowerPrice)}/ct) and {result.upperBand}ct ({formatUSD(result.upperPrice)}/ct)
            </div>
          )}
        </div>
      )}

      {caratNum <= 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center text-gray-500">
          Enter a valid carat weight to see the price estimate
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Reference prices for {color} / {clarity}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {nearestBands.map(({ band, price }) => (
            <div
              key={band}
              className={`rounded-lg border p-3 text-center text-sm ${
                result && (band === result.lowerBand || band === result.upperBand)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="font-medium text-gray-500">{band} ct</div>
              <div className="font-semibold text-gray-900">{formatUSD(price!)}</div>
              <div className="text-xs text-gray-400">{formatUSD(price! * parseFloat(band))} total</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
