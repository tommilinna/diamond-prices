import { useState, useEffect, useMemo } from 'react'
import type { MatrixData } from '../api/openfacet'
import { getSnapshots } from '../lib/historyDb'
import type { DailySnapshot } from '../lib/historyDb'
import { getMatrixPrice } from '../utils/price'
import { FRED_DIAMOND_INDEX } from '../data/fredDiamonds'

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | 'All'

export interface PricePoint {
  date: string
  price: number
}

function getStartDate(range: TimeRange): string | undefined {
  if (range === 'All') return undefined
  const now = new Date()
  const months: Record<Exclude<TimeRange, 'All'>, number> = {
    '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '2Y': 24,
  }
  now.setMonth(now.getMonth() - months[range])
  return now.toISOString().slice(0, 10)
}

/** Latest FRED index value (used as denominator for normalization) */
const latestFredValue = FRED_DIAMOND_INDEX[FRED_DIAMOND_INDEX.length - 1].value

/** Last date in FRED data, shown in UI as staleness indicator */
export const FRED_LAST_DATE = FRED_DIAMOND_INDEX[FRED_DIAMOND_INDEX.length - 1].date

export function usePriceHistory(
  matrix: MatrixData | null,
  caratBand: string,
  color: string,
  clarity: string,
) {
  const [range, setRange] = useState<TimeRange>('1Y')
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([])
  const [loading, setLoading] = useState(true)

  const matrixTs = matrix?.ts

  // Reload when range changes or when matrix.ts changes (new save triggers reload)
  useEffect(() => {
    let cancelled = false
    const from = getStartDate(range)
    getSnapshots(from).then(data => {
      if (!cancelled) {
        setSnapshots(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [range, matrixTs])

  // Current per-carat price from live OpenFacet matrix
  const currentPrice = matrix
    ? getMatrixPrice(matrix, caratBand, color, clarity)
    : null

  // Derive actual price points from snapshots
  const actualData: PricePoint[] = useMemo(() => {
    if (!matrix) return []
    return snapshots
      .map(snap => {
        const syntheticMatrix: MatrixData = {
          c: matrix.c,
          r: matrix.r,
          s: matrix.s,
          l: snap.l,
          ts: snap.ts,
        }
        const price = getMatrixPrice(syntheticMatrix, caratBand, color, clarity)
        return price != null ? { date: snap.date, price } : null
      })
      .filter((p): p is PricePoint => p != null)
  }, [matrix, snapshots, caratBand, color, clarity])

  // Derive FRED estimated price points
  const fredData: PricePoint[] = useMemo(() => {
    const startDate = getStartDate(range)
    return FRED_DIAMOND_INDEX
      .filter(entry => !startDate || entry.date >= startDate)
      .map(entry => {
        if (currentPrice != null) {
          // Normalize: estimated = currentPrice * (fredValue / latestFredValue)
          return { date: entry.date, price: currentPrice * (entry.value / latestFredValue) }
        }
        // Fallback: show raw index if no current price
        return { date: entry.date, price: entry.value }
      })
  }, [range, currentPrice])

  // Whether FRED data is shown as raw index (no normalization)
  const fredIsRawIndex = currentPrice == null

  return {
    actualData,
    fredData,
    fredIsRawIndex,
    range,
    setRange,
    loading,
    snapshotCount: snapshots.length,
  }
}
