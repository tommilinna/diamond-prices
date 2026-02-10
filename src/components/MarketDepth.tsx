import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DepthData } from '../api/openfacet'
import { CARAT_BANDS } from '../utils/price'

interface MarketDepthProps {
  depth: DepthData
}

export default function MarketDepth({ depth }: MarketDepthProps) {
  const caratTotals = useMemo(() => {
    return CARAT_BANDS.map(band => {
      const colorData = depth.color[band]
      if (!colorData) return { band, total: 0 }
      const total = Object.values(colorData).reduce((sum, count) => sum + count, 0)
      return { band, total }
    })
  }, [depth])

  const clarityTotals = useMemo(() => {
    const clarities = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2']
    return clarities.map(clarity => {
      let total = 0
      for (const band of CARAT_BANDS) {
        total += depth.clarity[band]?.[clarity] ?? 0
      }
      return { clarity, total }
    })
  }, [depth])

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-white dark:bg-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Supply by Carat Weight
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={caratTotals} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="band"
              tick={{ fontSize: 12 }}
              tickFormatter={v => `${v}ct`}
            />
            <YAxis tick={{ fontSize: 12 }} width={50} />
            <Tooltip
              formatter={(value: number | undefined) => [value?.toLocaleString() ?? '0', 'Count']}
              labelFormatter={label => `${label} ct`}
            />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-800 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Supply by Clarity
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={clarityTotals} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="clarity" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} width={50} />
            <Tooltip
              formatter={(value: number | undefined) => [value?.toLocaleString() ?? '0', 'Count']}
              labelFormatter={label => label}
            />
            <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
