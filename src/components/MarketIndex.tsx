import { useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import type { IndexData } from '../api/openfacet'
import { formatUSD, formatPercent } from '../utils/price'

interface MarketIndexProps {
  index: IndexData
}

export default function MarketIndex({ index }: MarketIndexProps) {
  const isPositive = index.trend >= 0

  const sparklineData = useMemo(() => {
    return [...index.specs]
      .sort((a, b) => a.per_carat - b.per_carat)
      .map(s => ({ value: s.per_carat }))
  }, [index.specs])

  const strokeColor = isPositive ? '#10b981' : '#ef4444'
  const fillColor = isPositive ? '#10b981' : '#ef4444'

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Market Overview</h2>

      <div className="rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-800 border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">DCX Diamond Index</div>
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {index.dcx.toFixed(2)}
            </span>
            <span
              className={`text-lg font-semibold flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}
            >
              <span>{isPositive ? '\u25B2' : '\u25BC'}</span>
              {formatPercent(index.trend)}
            </span>
          </div>
          {sparklineData.length > 1 && (
            <div className="w-[200px] h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={fillColor} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                    fill="url(#sparkFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Last updated: {new Date(index.ts).toLocaleString()}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Example Stones
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                  Carat
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                  Color
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                  Clarity
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                  $/ct
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                  Price
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 border-b dark:border-gray-700">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {index.specs.map((spec, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <td className="px-3 py-2 font-mono dark:text-gray-300">
                    {spec.carat.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 dark:text-gray-300">{spec.color}</td>
                  <td className="px-3 py-2 dark:text-gray-300">{spec.clarity}</td>
                  <td className="px-3 py-2 text-right font-mono dark:text-gray-300">
                    {formatUSD(spec.per_carat)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold dark:text-gray-200">
                    {formatUSD(spec.price)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${spec.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {formatPercent(spec.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
