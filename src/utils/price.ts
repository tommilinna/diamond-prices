import type { MatrixData } from '../api/openfacet'

/** Convert a log value from the matrix to USD price per carat */
export function logToPrice(logValue: number): number {
  return Math.exp(logValue)
}

/** Format a number as USD */
export function formatUSD(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/** Get price per carat from matrix for a specific carat band, color, and clarity */
export function getMatrixPrice(
  matrix: MatrixData,
  caratBand: string,
  color: string,
  clarity: string,
): number | null {
  const logValues = matrix.l[caratBand]
  if (!logValues) return null

  const rowIdx = matrix.r.indexOf(color)
  const colIdx = matrix.c.indexOf(clarity)
  if (rowIdx === -1 || colIdx === -1) return null

  const cols = matrix.s[1]
  const logValue = logValues[rowIdx * cols + colIdx]
  if (logValue == null || logValue === 0) return null

  return logToPrice(logValue)
}

/** All available carat bands in order */
export const CARAT_BANDS = ['0.3', '0.4', '0.5', '0.7', '0.9', '1.0', '1.5', '2.0', '3.0', '5.0']

/** Color grades D–M */
export const COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']

/** Clarity grades FL–SI2 */
export const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2']

/** Find the two nearest carat bands for interpolation */
function findBracketBands(carat: number): { lower: string; upper: string; lambda: number } | null {
  const numericBands = CARAT_BANDS.map(Number)

  if (carat <= numericBands[0]) {
    return { lower: CARAT_BANDS[0], upper: CARAT_BANDS[0], lambda: 0 }
  }
  if (carat >= numericBands[numericBands.length - 1]) {
    const last = CARAT_BANDS[CARAT_BANDS.length - 1]
    return { lower: last, upper: last, lambda: 0 }
  }

  for (let i = 0; i < numericBands.length - 1; i++) {
    if (carat >= numericBands[i] && carat <= numericBands[i + 1]) {
      const range = numericBands[i + 1] - numericBands[i]
      const lambda = range === 0 ? 0 : (carat - numericBands[i]) / range
      return { lower: CARAT_BANDS[i], upper: CARAT_BANDS[i + 1], lambda }
    }
  }

  return null
}

/** Interpolate price for an arbitrary carat weight between two bands */
export function interpolatePrice(
  matrix: MatrixData,
  carat: number,
  color: string,
  clarity: string,
): { pricePerCarat: number; totalPrice: number; lowerBand: string; upperBand: string; lowerPrice: number; upperPrice: number } | null {
  const bracket = findBracketBands(carat)
  if (!bracket) return null

  const lowerPrice = getMatrixPrice(matrix, bracket.lower, color, clarity)
  const upperPrice = getMatrixPrice(matrix, bracket.upper, color, clarity)
  if (lowerPrice == null || upperPrice == null) return null

  const pricePerCarat = lowerPrice + bracket.lambda * (upperPrice - lowerPrice)
  return {
    pricePerCarat,
    totalPrice: pricePerCarat * carat,
    lowerBand: bracket.lower,
    upperBand: bracket.upper,
    lowerPrice,
    upperPrice,
  }
}

/** Format a percentage change with sign */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(2)}%`
}
