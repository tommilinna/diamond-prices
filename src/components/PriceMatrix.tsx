import { useMemo, useState } from 'react'
import type { MatrixData, DepthData } from '../api/openfacet'
import { logToPrice, formatUSD } from '../utils/price'
import CaratSelector from './CaratSelector'

interface PriceMatrixProps {
  matrix: MatrixData
  depth: DepthData
  previousMatrix?: MatrixData | null
}

export default function PriceMatrix({ matrix, depth, previousMatrix }: PriceMatrixProps) {
  const [caratBand, setCaratBand] = useState('1.0')
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  const { prices, prevPrices, minPrice, maxPrice } = useMemo(() => {
    const logValues = matrix.l[caratBand]
    if (!logValues) return { prices: [] as number[][], prevPrices: null as number[][] | null, minPrice: 0, maxPrice: 0 }

    const prevLogValues = previousMatrix?.l[caratBand] ?? null
    const cols = matrix.s[1]
    let min = Infinity
    let max = -Infinity
    const grid: number[][] = []
    const prevGrid: number[][] | null = prevLogValues ? [] : null

    for (let r = 0; r < matrix.r.length; r++) {
      const row: number[] = []
      const prevRow: number[] = []
      for (let c = 0; c < matrix.c.length; c++) {
        const logVal = logValues[r * cols + c]
        const price = logVal != null && logVal !== 0 ? logToPrice(logVal) : 0
        row.push(price)
        if (price > 0) {
          min = Math.min(min, price)
          max = Math.max(max, price)
        }
        if (prevLogValues) {
          const prevLog = prevLogValues[r * cols + c]
          prevRow.push(prevLog != null && prevLog !== 0 ? logToPrice(prevLog) : 0)
        }
      }
      grid.push(row)
      if (prevGrid) prevGrid.push(prevRow)
    }

    return { prices: grid, prevPrices: prevGrid, minPrice: min === Infinity ? 0 : min, maxPrice: max === -Infinity ? 0 : max }
  }, [matrix, previousMatrix, caratBand])

  function getCellColor(price: number): string {
    if (price === 0 || maxPrice === minPrice) return 'bg-gray-50 dark:bg-gray-800'
    const ratio = (price - minPrice) / (maxPrice - minPrice)
    if (ratio < 0.25) return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300'
    if (ratio < 0.5) return 'bg-lime-100 text-lime-900 dark:bg-lime-900/40 dark:text-lime-300'
    if (ratio < 0.75) return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
    return 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-300'
  }

  function getFlashClass(rowIdx: number, colIdx: number): string {
    if (!prevPrices) return ''
    const curr = prices[rowIdx]?.[colIdx] ?? 0
    const prev = prevPrices[rowIdx]?.[colIdx] ?? 0
    if (curr === 0 || prev === 0 || curr === prev) return ''
    return curr > prev ? 'animate-flash-green' : 'animate-flash-red'
  }

  function getDelta(rowIdx: number, colIdx: number): { amount: number; percent: number } | null {
    if (!prevPrices) return null
    const curr = prices[rowIdx]?.[colIdx] ?? 0
    const prev = prevPrices[rowIdx]?.[colIdx] ?? 0
    if (curr === 0 || prev === 0 || curr === prev) return null
    return { amount: curr - prev, percent: (curr - prev) / prev }
  }

  function estimateSupply(color: string, clarity: string): number | null {
    const colclarCount = depth.colclar?.[color]?.[clarity]
    const bandColorCount = depth.color[caratBand]?.[color]
    if (colclarCount == null || bandColorCount == null) return null

    let totalColor = 0
    for (const band of Object.keys(depth.color)) {
      totalColor += depth.color[band]?.[color] ?? 0
    }
    if (totalColor === 0) return null

    return Math.round(colclarCount * bandColorCount / totalColor)
  }

  function exportCSV() {
    const rows = [['Color', ...matrix.c].join(',')]
    matrix.r.forEach((color, rowIdx) => {
      const values = matrix.c.map((_, colIdx) => {
        const price = prices[rowIdx]?.[colIdx] ?? 0
        return price > 0 ? Math.round(price * parseFloat(caratBand)) : ''
      })
      rows.push([color, ...values].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diamond-prices-${caratBand}ct.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Price Matrix</h2>
          <button
            onClick={exportCSV}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            aria-label="Export prices as CSV"
            title="Download CSV"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </button>
        </div>
        <CaratSelector selected={caratBand} onChange={setCaratBand} />
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Total stone price (USD) for {caratBand} ct round brilliant (3EX, no fluorescence)
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm" aria-label={`Diamond prices for ${caratBand} carat stones`}>
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-700"
              >
                Color
              </th>
              {matrix.c.map(clarity => (
                <th
                  key={clarity}
                  scope="col"
                  className="px-3 py-2 text-center font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                >
                  {clarity}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.r.map((color, rowIdx) => (
              <tr key={color} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <td
                  scope="row"
                  className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-3 py-2 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700"
                >
                  {color}
                </td>
                {matrix.c.map((clarity, colIdx) => {
                  const pricePerCarat = prices[rowIdx]?.[colIdx] ?? 0
                  const caratWeight = parseFloat(caratBand)
                  const totalPrice = pricePerCarat * caratWeight
                  const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.col === colIdx
                  const supplyEstimate = estimateSupply(color, clarity)
                  const flash = getFlashClass(rowIdx, colIdx)
                  const delta = getDelta(rowIdx, colIdx)
                  const showBelow = rowIdx < 2

                  return (
                    <td
                      key={clarity}
                      className={`px-3 py-2 text-center font-mono relative transition-all ${getCellColor(pricePerCarat)} ${flash} ${
                        isHovered ? 'ring-2 ring-blue-500 ring-inset z-20' : ''
                      }`}
                      onMouseEnter={() => setHoveredCell({ row: rowIdx, col: colIdx })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {pricePerCarat > 0 ? formatUSD(totalPrice) : '—'}
                      {isHovered && pricePerCarat > 0 && (
                        <div className={`absolute left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-30 shadow-lg ${
                          showBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                        }`}>
                          <div className="font-semibold">{color} / {clarity} / {caratBand}ct</div>
                          <div>{formatUSD(pricePerCarat)} /ct</div>
                          <div>Total: {formatUSD(totalPrice)}</div>
                          {delta && (
                            <div className={delta.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                              {delta.amount >= 0 ? '+' : ''}{formatUSD(delta.amount * caratWeight)} ({delta.amount >= 0 ? '+' : ''}{(delta.percent * 100).toFixed(1)}%)
                            </div>
                          )}
                          {supplyEstimate != null && (
                            <div className="text-gray-400">
                              Supply: ~{supplyEstimate} stones
                            </div>
                          )}
                          <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent ${
                            showBelow
                              ? 'bottom-full border-b-4 border-b-gray-900'
                              : 'top-full border-t-4 border-t-gray-900'
                          }`} />
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
