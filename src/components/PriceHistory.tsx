import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { MatrixData } from '../api/openfacet'
import { usePriceHistory, FRED_LAST_DATE } from '../hooks/usePriceHistory'
import type { TimeRange } from '../hooks/usePriceHistory'
import { formatUSD, COLORS, CLARITIES } from '../utils/price'
import CaratSelector from './CaratSelector'

interface PriceHistoryProps {
  matrix: MatrixData
}

const TIME_RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', '2Y', 'All']

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

interface ChartRow {
  date: string
  fredPrice?: number
  actualPrice?: number
}

export default function PriceHistory({ matrix }: PriceHistoryProps) {
  const [caratBand, setCaratBand] = useState('1.0')
  const [color, setColor] = useState('G')
  const [clarity, setClarity] = useState('VS2')

  const { actualData, fredData, fredIsRawIndex, range, setRange, loading } = usePriceHistory(
    matrix, caratBand, color, clarity,
  )

  // Merge FRED + actual into unified chart rows
  const chartData: ChartRow[] = useMemo(() => {
    const map = new Map<string, ChartRow>()

    for (const pt of fredData) {
      map.set(pt.date, { date: pt.date, fredPrice: pt.price })
    }
    for (const pt of actualData) {
      const existing = map.get(pt.date)
      if (existing) {
        // Actual takes priority — drop FRED for this date
        existing.actualPrice = pt.price
        existing.fredPrice = undefined
      } else {
        map.set(pt.date, { date: pt.date, actualPrice: pt.price })
      }
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [fredData, actualData])

  // Summary stats — use actual data when available, fall back to FRED
  const allPrices = useMemo(() => {
    const combined = actualData.length > 0 ? actualData : fredData
    return combined.map(d => d.price)
  }, [actualData, fredData])

  const current = allPrices.length > 0 ? allPrices[allPrices.length - 1] : null
  const min = allPrices.length > 0 ? Math.min(...allPrices) : null
  const max = allPrices.length > 0 ? Math.max(...allPrices) : null
  const first = allPrices.length > 0 ? allPrices[0] : null
  const change = current != null && first != null && first > 0
    ? (current - first) / first
    : null

  const hasChartData = chartData.length >= 2

  const fredLastMonth = new Date(FRED_LAST_DATE + 'T00:00:00')
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  const priceLabel = fredIsRawIndex ? 'Market Index' : '/ct'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Price History</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Per-carat price trends from daily snapshots and FRED market index
        </p>
      </div>

      <div className="space-y-4">
        <CaratSelector selected={caratBand} onChange={setCaratBand} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Color</label>
            <select
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
            >
              {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Clarity</label>
            <select
              value={clarity}
              onChange={e => setClarity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200"
            >
              {CLARITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                range === r
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading history...</div>
      ) : !hasChartData ? (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {chartData.length === 1
              ? formatUSD(chartData[0].actualPrice ?? chartData[0].fredPrice ?? 0)
              : '\u2014'}
            {chartData.length === 1 && <span className="text-sm font-normal text-gray-500">{priceLabel}</span>}
          </p>
          {chartData.length === 1 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatDateFull(chartData[0].date)}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Not enough data points for the selected range. Try a longer time range.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                tickFormatter={v => fredIsRawIndex ? String(v) : formatUSD(v as number)}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                width={80}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0]?.payload as ChartRow
                  const items: { label: string; value: number }[] = []
                  if (row.actualPrice != null) items.push({ label: 'Actual', value: row.actualPrice })
                  if (row.fredPrice != null) items.push({ label: 'Estimated', value: row.fredPrice })
                  if (items.length === 0) return null
                  return (
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                      <div className="font-medium">{formatDateFull(row.date)}</div>
                      {items.map(item => (
                        <div key={item.label}>
                          <span className="text-gray-400">{item.label}: </span>
                          {fredIsRawIndex ? item.value.toFixed(1) : `${formatUSD(item.value)}${priceLabel}`}
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              {/* FRED estimated — dashed, lighter blue, no fill */}
              <Area
                type="monotone"
                dataKey="fredPrice"
                stroke="#93c5fd"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="none"
                connectNulls
                isAnimationActive={false}
              />
              {/* OpenFacet actual — solid, gradient fill */}
              <Area
                type="monotone"
                dataKey="actualPrice"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#historyFill)"
                connectNulls
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#3b82f6" strokeWidth="2" /></svg>
              Actual (OpenFacet)
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 3" /></svg>
              Estimated (FRED index)
            </span>
          </div>

          {/* FRED staleness note */}
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            Market trend data updated {fredLastMonth}
          </p>
        </div>
      )}

      {hasChartData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Current</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {current != null ? (fredIsRawIndex ? current.toFixed(1) : formatUSD(current)) : '\u2014'}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Min</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {min != null ? (fredIsRawIndex ? min.toFixed(1) : formatUSD(min)) : '\u2014'}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Max</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {max != null ? (fredIsRawIndex ? max.toFixed(1) : formatUSD(max)) : '\u2014'}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400">Change</div>
            <div className={`font-semibold ${change != null && change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {change != null ? `${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%` : '\u2014'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
