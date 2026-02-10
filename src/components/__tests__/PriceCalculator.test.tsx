import { render, screen, fireEvent } from '@testing-library/react'
import type { MatrixData } from '../../api/openfacet'
import { CARAT_BANDS, formatUSD } from '../../utils/price'
import PriceCalculator from '../PriceCalculator'

// ---------- helpers ----------

const COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2']

/** Different log values per band so interpolation produces distinct results */
const BAND_LOG_VALUES: Record<string, number> = {
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

function createMockMatrix(
  fill: (band: string, colorIdx: number, clarityIdx: number) => number = (band) =>
    BAND_LOG_VALUES[band] ?? 8,
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

/**
 * The component's labels are not linked to inputs via htmlFor/id,
 * so we locate inputs by their role and surrounding context.
 */
function getCaratInput(): HTMLInputElement {
  return screen.getByRole('spinbutton') as HTMLInputElement
}

function getColorSelect(): HTMLSelectElement {
  // There are two <select> elements. The first is Color, the second is Clarity.
  const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
  return selects[0]
}

function getClaritySelect(): HTMLSelectElement {
  const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
  return selects[1]
}

// ---------- tests ----------

describe('PriceCalculator', () => {
  const matrix = createMockMatrix()

  it('renders the heading and description', () => {
    render(<PriceCalculator matrix={matrix} />)

    expect(screen.getByText('Price Calculator')).toBeInTheDocument()
    expect(
      screen.getByText('Estimate diamond price by interpolating between carat bands'),
    ).toBeInTheDocument()
  })

  it('renders with default values (1.00 ct, G, VS2)', () => {
    render(<PriceCalculator matrix={matrix} />)

    expect(getCaratInput().value).toBe('1.00')
    expect(getColorSelect().value).toBe('G')
    expect(getClaritySelect().value).toBe('VS2')
  })

  it('shows price per carat and total price for default values', () => {
    render(<PriceCalculator matrix={matrix} />)

    // Default carat 1.00 falls in [0.9, 1.0] with lambda=1.0, so price = exp(8.2)
    // The formatted price appears multiple times (result + reference grid), so use getAllByText
    const expectedPricePerCarat = Math.exp(BAND_LOG_VALUES['1.0'])
    const matches = screen.getAllByText(formatUSD(expectedPricePerCarat))
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Price per carat')).toBeInTheDocument()
    expect(screen.getByText(/Total price/)).toBeInTheDocument()
  })

  it('updates the displayed price when carat input changes', () => {
    render(<PriceCalculator matrix={matrix} />)

    fireEvent.change(getCaratInput(), { target: { value: '2.00' } })

    // Carat 2.0 falls in [1.5, 2.0] with lambda=1.0, so price per carat = exp(8.8)
    // The total price = exp(8.8) * 2, which is unique in the DOM
    const expectedPerCarat = Math.exp(BAND_LOG_VALUES['2.0'])
    const expectedTotal = expectedPerCarat * 2
    expect(screen.getByText(formatUSD(expectedTotal))).toBeInTheDocument()
    expect(screen.getByText(/Total price \(2 ct\)/)).toBeInTheDocument()
  })

  it('shows reference prices section', () => {
    render(<PriceCalculator matrix={matrix} />)

    expect(screen.getByText('Reference prices for G / VS2')).toBeInTheDocument()

    for (const band of CARAT_BANDS) {
      expect(screen.getByText(`${band} ct`)).toBeInTheDocument()
    }
  })

  it('shows interpolation info when carat is between bands', () => {
    render(<PriceCalculator matrix={matrix} />)

    fireEvent.change(getCaratInput(), { target: { value: '1.25' } })

    const lowerPrice = Math.exp(BAND_LOG_VALUES['1.0'])
    const upperPrice = Math.exp(BAND_LOG_VALUES['1.5'])
    expect(
      screen.getByText(
        `Interpolated between 1.0ct (${formatUSD(lowerPrice)}/ct) and 1.5ct (${formatUSD(upperPrice)}/ct)`,
      ),
    ).toBeInTheDocument()
  })

  it('does not show interpolation info when carat matches an exact band boundary', () => {
    render(<PriceCalculator matrix={matrix} />)

    // Default 1.00 lands in [0.9, 1.0] with lambda=1. lower != upper, so
    // interpolation info IS shown. Switch to 0.3 which clamps to [0.3, 0.3].
    fireEvent.change(getCaratInput(), { target: { value: '0.30' } })

    expect(screen.queryByText(/Interpolated between/)).not.toBeInTheDocument()
  })

  it('shows a prompt when carat is zero or invalid', () => {
    render(<PriceCalculator matrix={matrix} />)

    fireEvent.change(getCaratInput(), { target: { value: '0' } })

    expect(
      screen.getByText('Enter a valid carat weight to see the price estimate'),
    ).toBeInTheDocument()
  })

  it('updates reference prices when color changes', () => {
    render(<PriceCalculator matrix={matrix} />)

    fireEvent.change(getColorSelect(), { target: { value: 'D' } })

    expect(screen.getByText('Reference prices for D / VS2')).toBeInTheDocument()
  })

  it('updates reference prices when clarity changes', () => {
    render(<PriceCalculator matrix={matrix} />)

    fireEvent.change(getClaritySelect(), { target: { value: 'FL' } })

    expect(screen.getByText('Reference prices for G / FL')).toBeInTheDocument()
  })

  it('renders all color options in the select', () => {
    render(<PriceCalculator matrix={matrix} />)

    const options = Array.from(getColorSelect().options).map((o) => o.value)
    expect(options).toEqual(COLORS)
  })

  it('renders all clarity options in the select', () => {
    render(<PriceCalculator matrix={matrix} />)

    const options = Array.from(getClaritySelect().options).map((o) => o.value)
    expect(options).toEqual(CLARITIES)
  })

  it('shows reference price values formatted as USD', () => {
    render(<PriceCalculator matrix={matrix} />)

    // Verify at least one reference price is rendered as formatted USD
    const price03 = Math.exp(BAND_LOG_VALUES['0.3'])
    expect(screen.getByText(formatUSD(price03))).toBeInTheDocument()
  })
})
