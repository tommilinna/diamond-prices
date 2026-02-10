const BASE_URL = 'https://data.openfacet.net'

// --- index.json types ---
export interface SpecItem {
  carat: number
  clarity: string
  color: string
  cut: string
  log: number
  per_carat: number
  price: number
  trend: number
  weight: number
}

export interface IndexData {
  dcx: number
  trend: number
  ts: string
  specs: SpecItem[]
}

// --- matrix.json types ---
export interface MatrixData {
  c: string[]       // clarity grades: ["FL","IF","VVS1","VVS2","VS1","VS2","SI1","SI2"]
  r: string[]       // color grades: ["D","E","F","G","H","I","J","K","L","M"]
  s: [number, number] // dimensions [rows, cols] = [10, 8]
  l: Record<string, number[]> // log prices per carat band, 80 values each
  ts: string
}

// --- depth.json types ---
export interface DepthData {
  clarity: Record<string, Record<string, number>> // carat -> clarity -> count
  color: Record<string, Record<string, number>>   // carat -> color -> count
  colclar: Record<string, Record<string, number>> // color -> clarity -> count
  ts: string
}

export async function fetchIndex(): Promise<IndexData> {
  const res = await fetch(`${BASE_URL}/index.json`)
  if (!res.ok) throw new Error(`Failed to fetch index: ${res.status}`)
  return res.json()
}

export async function fetchMatrix(): Promise<MatrixData> {
  const res = await fetch(`${BASE_URL}/matrix.json`)
  if (!res.ok) throw new Error(`Failed to fetch matrix: ${res.status}`)
  return res.json()
}

export async function fetchDepth(): Promise<DepthData> {
  const res = await fetch(`${BASE_URL}/depth.json`)
  if (!res.ok) throw new Error(`Failed to fetch depth: ${res.status}`)
  return res.json()
}
