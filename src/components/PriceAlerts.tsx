import { useState } from 'react'
import type { MatrixData } from '../api/openfacet'
import type { Alert } from '../hooks/useAlerts'
import { getCurrentPrice } from '../hooks/useAlerts'
import { formatUSD, CARAT_BANDS, COLORS, CLARITIES } from '../utils/price'

interface PriceAlertsProps {
  matrix: MatrixData
  alerts: Alert[]
  onAdd: (alert: Omit<Alert, 'id' | 'triggered'>) => void
  onRemove: (id: string) => void
}

export default function PriceAlerts({ matrix, alerts, onAdd, onRemove }: PriceAlertsProps) {
  const [carat, setCarat] = useState('1.0')
  const [color, setColor] = useState('G')
  const [clarity, setClarity] = useState('VS2')
  const [targetPrice, setTargetPrice] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('below')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(targetPrice)
    if (isNaN(price) || price <= 0) return

    onAdd({
      carat: parseFloat(carat),
      color,
      clarity,
      targetPrice: price,
      direction,
    })
    setTargetPrice('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Price Alerts</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Get notified when diamond prices cross your target. Alerts persist in your browser.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Create Alert</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Carat</label>
            <select
              value={carat}
              onChange={e => setCarat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
            >
              {CARAT_BANDS.map(b => (
                <option key={b} value={b}>{b} ct</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Color</label>
            <select
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
            >
              {COLORS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Clarity</label>
            <select
              value={clarity}
              onChange={e => setClarity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
            >
              {CLARITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Target $/ct</label>
            <input
              type="number"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              placeholder="e.g. 5000"
              min="1"
              step="1"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setDirection('below')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                direction === 'below'
                  ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Below target
            </button>
            <button
              type="button"
              onClick={() => setDirection('above')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                direction === 'above'
                  ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Above target
            </button>
          </div>

          <button
            type="submit"
            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Create Alert
          </button>
        </div>
      </form>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          No alerts yet. Create one above to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map(alert => {
            const currentPrice = getCurrentPrice(matrix, alert.carat, alert.color, alert.clarity)
            const progress = currentPrice != null
              ? alert.direction === 'below'
                ? Math.min(1, Math.max(0, (alert.targetPrice - currentPrice) / alert.targetPrice))
                : Math.min(1, Math.max(0, currentPrice / alert.targetPrice))
              : 0

            return (
              <div
                key={alert.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border p-4 flex items-center gap-4 ${
                  alert.triggered ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {alert.carat}ct {alert.color} {alert.clarity}
                    </span>
                    {alert.triggered && (
                      <span className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 text-xs font-medium rounded">
                        Triggered
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Target: {formatUSD(alert.targetPrice)}/ct {alert.direction}
                    {currentPrice != null && (
                      <span className="ml-2">
                        Current: {formatUSD(currentPrice)}/ct
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        alert.triggered
                          ? 'bg-amber-400'
                          : alert.direction === 'below'
                          ? 'bg-red-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => onRemove(alert.id)}
                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 cursor-pointer"
                  aria-label="Delete alert"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
