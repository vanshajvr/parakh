// Saves the time machine's price history as a static file before each build (decision D-044), so
// Practice loads from Vercel's CDN and never waits for the API to wake up. If the API can't be
// reached, the build still succeeds and the app falls back to fetching from the API.
import { writeFile } from 'node:fs/promises'

const SOURCE = process.env.SIM_PRICES_URL ?? 'https://parakh-api-xjg6.onrender.com/api/sim/prices'
const TARGET = new URL('../public/sim-prices.json', import.meta.url)

for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    // The free API host can take up to a minute to wake.
    const res = await fetch(SOURCE, { signal: AbortSignal.timeout(120_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data.dates) || data.dates.length === 0) throw new Error('no dates in the response')
    await writeFile(TARGET, JSON.stringify(data))
    console.log(`sim-prices.json: ${data.dates.length} days, ${data.stocks.length} series, up to ${data.dates.at(-1)}`)
    process.exit(0)
  } catch (err) {
    console.warn(`sim-prices.json: attempt ${attempt} failed (${err.message})`)
  }
}
console.warn('sim-prices.json: not saved; Practice will load prices from the API instead')
