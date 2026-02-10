import type { MatrixData } from '../../api/openfacet'
import {
  logToPrice,
  formatUSD,
  getMatrixPrice,
  interpolatePrice,
  formatPercent,
  CARAT_BANDS,
} from '../price'

// ---------- helpers ----------

const COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2']

/**
 * Build a minimal MatrixData object for testing.
 * Each carat band gets a flat array of 80 log-price values (10 colors x 8 clarities).
 * The `fill` callback receives (bandKey, colorIdx, clarityIdx) and returns the log value.
 */
function createMockMatrix(
  fill: (band: string, colorIdx: number, clarityIdx: number) => number = () => 8,
): MatrixData {
  const l: Record<string, number[]> = {}
  for (const band of CARAT_BANDS) {
    const values: number[] = []
    for (let r = 0; r < COLORS.length; r++) {
      for (let c = 0; c < CLARITIES.length; c++) {
        values.push(fill(band, r, c))
      }
    }
    l[band] = values
  }

  return {
    c: CLARITIES,
    r: COLORS,
    s: [COLORS.length, CLARITIES.length] as [number, number],
    l,
    ts: '2025-01-01T00:00:00Z',
  }
}

// ---------- logToPrice ----------

describe('logToPrice', () => {
  it('returns 1 for logValue 0', () => {
    expect(logToPrice(0)).toBe(1)
  })

  it('returns e for logValue 1', () => {
    expect(logToPrice(1)).toBeCloseTo(Math.E, 10)
  })

  it('handles negative log values', () => {
    expect(logToPrice(-1)).toBeCloseTo(1 / Math.E, 10)
  })

  it('handles large log values', () => {
    expect(logToPrice(10)).toBeCloseTo(Math.exp(10), 5)
  })
})

// ---------- formatUSD ----------

describe('formatUSD', () => {
  it('formats 100 as $100', () => {
    expect(formatUSD(100)).toBe('$100')
  })

  it('formats 1500 with comma separator', () => {
    expect(formatUSD(1500)).toBe('$1,500')
  })

  it('formats 50000', () => {
    expect(formatUSD(50000)).toBe('$50,000')
  })

  it('formats zero as $0', () => {
    expect(formatUSD(0)).toBe('$0')
  })

  it('rounds fractional prices to nearest dollar', () => {
    expect(formatUSD(99.5)).toBe('$100')
    expect(formatUSD(99.4)).toBe('$99')
  })
})

// ---------- getMatrixPrice ----------

describe('getMatrixPrice', () => {
  const LOG_VALUE = 8.5
  const matrix = createMockMatrix(() => LOG_VALUE)

  it('returns the exponentiated price for a valid lookup', () => {
    const price = getMatrixPrice(matrix, '1.0', 'G', 'VS2')
    expect(price).toBeCloseTo(Math.exp(LOG_VALUE), 5)
  })

  it('returns null for an unknown carat band', () => {
    expect(getMatrixPrice(matrix, '99.0', 'G', 'VS2')).toBeNull()
  })

  it('returns null for an unknown color', () => {
    expect(getMatrixPrice(matrix, '1.0', 'Z', 'VS2')).toBeNull()
  })

  it('returns null for an unknown clarity', () => {
    expect(getMatrixPrice(matrix, '1.0', 'G', 'XXX')).toBeNull()
  })

  it('returns null when the log value is zero', () => {
    const zeroMatrix = createMockMatrix(() => 0)
    expect(getMatrixPrice(zeroMatrix, '1.0', 'G', 'VS2')).toBeNull()
  })

  it('returns null when the log value is null-ish (undefined)', () => {
    const sparseMatrix = createMockMatrix(() => 8)
    // Make the array shorter so the target index is out of bounds (undefined)
    sparseMatrix.l['1.0'] = [8]
    expect(getMatrixPrice(sparseMatrix, '1.0', 'G', 'VS2')).toBeNull()
  })
})

// ---------- interpolatePrice ----------

describe('interpolatePrice', () => {
  // Use distinct log values per band so we can verify interpolation
  const bandLogValues: Record<string, number> = {
    '0.3': 7.0,
    '0.4': 7.2,
    '0.5': 7.5,
    '0.7': 7.8,
    '0.9': 8.0,
    '1.0': 8.2,
    '1.5': 8.5,
    '2.0': 8.8,
    '3.0': 9.0,
    '5.0': 9.5,
  }
  const matrix = createMockMatrix((band) => bandLogValues[band] ?? 0)

  it('returns exact band price when carat matches a band', () => {
    // 1.0 falls in the [0.9, 1.0] interval with lambda = 1.0, so the
    // result equals the upper-band price (exp(8.2)) with lower=0.9, upper=1.0
    const result = interpolatePrice(matrix, 1.0, 'G', 'VS2')
    expect(result).not.toBeNull()
    expect(result!.lowerBand).toBe('0.9')
    expect(result!.upperBand).toBe('1.0')
    expect(result!.pricePerCarat).toBeCloseTo(Math.exp(8.2), 5)
    expect(result!.totalPrice).toBeCloseTo(Math.exp(8.2) * 1.0, 5)
  })

  it('returns clamped price when carat matches the first band exactly', () => {
    const result = interpolatePrice(matrix, 0.3, 'G', 'VS2')
    expect(result).not.toBeNull()
    expect(result!.lowerBand).toBe('0.3')
    expect(result!.upperBand).toBe('0.3')
    expect(result!.pricePerCarat).toBeCloseTo(Math.exp(7.0), 5)
  })

  it('interpolates between two bands for an intermediate carat', () => {
    // 1.25 is between 1.0 and 1.5; lambda = (1.25 - 1.0) / (1.5 - 1.0) = 0.5
    const result = interpolatePrice(matrix, 1.25, 'G', 'VS2')
    expect(result).not.toBeNull()
    expect(result!.lowerBand).toBe('1.0')
    expect(result!.upperBand).toBe('1.5')

    const lowerPrice = Math.exp(8.2)
    const upperPrice = Math.exp(8.5)
    const expectedPerCarat = lowerPrice + 0.5 * (upperPrice - lowerPrice)
    expect(result!.pricePerCarat).toBeCloseTo(expectedPerCarat, 5)
    expect(result!.totalPrice).toBeCloseTo(expectedPerCarat * 1.25, 5)
    expect(result!.lowerPrice).toBeCloseTo(lowerPrice, 5)
    expect(result!.upperPrice).toBeCloseTo(upperPrice, 5)
  })

  it('clamps to the first band when carat is below minimum', () => {
    const result = interpolatePrice(matrix, 0.1, 'D', 'FL')
    expect(result).not.toBeNull()
    expect(result!.lowerBand).toBe('0.3')
    expect(result!.upperBand).toBe('0.3')
    expect(result!.pricePerCarat).toBeCloseTo(Math.exp(7.0), 5)
    expect(result!.totalPrice).toBeCloseTo(Math.exp(7.0) * 0.1, 5)
  })

  it('clamps to the last band when carat is above maximum', () => {
    const result = interpolatePrice(matrix, 8.0, 'D', 'FL')
    expect(result).not.toBeNull()
    expect(result!.lowerBand).toBe('5.0')
    expect(result!.upperBand).toBe('5.0')
    expect(result!.pricePerCarat).toBeCloseTo(Math.exp(9.5), 5)
    expect(result!.totalPrice).toBeCloseTo(Math.exp(9.5) * 8.0, 5)
  })

  it('returns null when matrix data is missing for the needed band', () => {
    const sparseMatrix = createMockMatrix(() => 8)
    // Remove a band entirely
    delete sparseMatrix.l['1.0']
    const result = interpolatePrice(sparseMatrix, 1.0, 'G', 'VS2')
    expect(result).toBeNull()
  })

  it('returns null when matrix values are zero for the needed band', () => {
    const zeroMatrix = createMockMatrix((band) => (band === '1.0' ? 0 : 8))
    const result = interpolatePrice(zeroMatrix, 1.0, 'G', 'VS2')
    expect(result).toBeNull()
  })
})

// ---------- formatPercent ----------

describe('formatPercent', () => {
  it('formats a positive value with a + sign', () => {
    expect(formatPercent(0.1234)).toBe('+12.34%')
  })

  it('formats a negative value with a - sign', () => {
    expect(formatPercent(-0.0567)).toBe('-5.67%')
  })

  it('formats zero as +0.00%', () => {
    expect(formatPercent(0)).toBe('+0.00%')
  })

  it('formats a small fractional change', () => {
    expect(formatPercent(0.001)).toBe('+0.10%')
  })

  it('formats a large change', () => {
    expect(formatPercent(1.5)).toBe('+150.00%')
  })
})

// ---------- CARAT_BANDS ----------

describe('CARAT_BANDS', () => {
  it('contains 10 bands', () => {
    expect(CARAT_BANDS).toHaveLength(10)
  })

  it('starts with 0.3 and ends with 5.0', () => {
    expect(CARAT_BANDS[0]).toBe('0.3')
    expect(CARAT_BANDS[CARAT_BANDS.length - 1]).toBe('5.0')
  })

  it('is in ascending order', () => {
    const numeric = CARAT_BANDS.map(Number)
    for (let i = 1; i < numeric.length; i++) {
      expect(numeric[i]).toBeGreaterThan(numeric[i - 1])
    }
  })
})
