#!/usr/bin/env bash
# Refresh pre-baked FRED IR42100 diamond index data
# Usage: bash scripts/fetch-fred.sh

set -euo pipefail

URL="https://fred.stlouisfed.org/graph/fredgraph.csv?id=IR42100&cosd=2024-01-01"
OUT="src/data/fredDiamonds.ts"

echo "Fetching FRED IR42100..."
CSV=$(curl -sS "$URL")

node -e "
const csv = process.argv[1];
const lines = csv.trim().split('\n').slice(1); // skip header
const entries = [];
for (const line of lines) {
  const [date, val] = line.split(',');
  if (!date || !val || val === '.' || val.trim() === '') continue;
  entries.push({ date: date.trim(), value: parseFloat(val) });
}

const body = entries.map(e =>
  '  { date: \\'\\'' + e.date + '\\'\\', value: ' + e.value + ' },'
).join('\n');

const ts = \`/**
 * FRED Series IR42100 — Import Price Index: Gem Diamonds
 * Source: https://fred.stlouisfed.org/series/IR42100
 * Last updated: \${new Date().toISOString().slice(0, 7)}
 *
 * Refresh with: bash scripts/fetch-fred.sh
 */
export const FRED_DIAMOND_INDEX: { date: string; value: number }[] = [
\${body}
]
\`;

process.stdout.write(ts);
" "$CSV" > "$OUT"

echo "Wrote $(grep -c 'date:' "$OUT") entries to $OUT"
