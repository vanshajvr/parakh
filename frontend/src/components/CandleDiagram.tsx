/** An up day and a down day, labelled: the "How to read a candle" explainer on How it works. */
export function CandleDiagram() {
  const label = 'fill-ink-2 text-[11px]'
  const tick = (x1: number, x2: number, y: number) => <line x1={x1} x2={x2} y1={y} y2={y} stroke="var(--line-2)" strokeDasharray="2 2" />
  return (
    <svg viewBox="0 0 320 170" className="block w-full max-w-sm" role="img"
      aria-label="Two candles. Left, an up day: a hollow box from the open at the bottom to the close at the top, with a thin line from the day's low to its high. Right, a down day: a filled box from the open at the top to the close at the bottom.">
      {/* Up day: opened low, closed high. */}
      <line x1={80} x2={80} y1={20} y2={150} stroke="var(--ink-2)" strokeWidth={1.5} />
      <rect x={62} y={45} width={36} height={75} fill="var(--surface)" stroke="var(--ink-2)" strokeWidth={1.5} />
      {tick(98, 112, 20)}{tick(98, 112, 45)}{tick(98, 112, 120)}{tick(98, 112, 150)}
      <text x={115} y={24} className={label}>High</text>
      <text x={115} y={49} className={label}>Close</text>
      <text x={115} y={124} className={label}>Open</text>
      <text x={115} y={154} className={label}>Low</text>
      <text x={80} y={167} textAnchor="middle" className="fill-ink text-[11px] font-semibold">Up day</text>

      {/* Down day: opened high, closed low. */}
      <line x1={230} x2={230} y1={30} y2={145} stroke="var(--ink-2)" strokeWidth={1.5} />
      <rect x={212} y={55} width={36} height={60} fill="var(--ink-2)" stroke="var(--ink-2)" strokeWidth={1.5} />
      {tick(248, 262, 30)}{tick(248, 262, 55)}{tick(248, 262, 115)}{tick(248, 262, 145)}
      <text x={265} y={34} className={label}>High</text>
      <text x={265} y={59} className={label}>Open</text>
      <text x={265} y={119} className={label}>Close</text>
      <text x={265} y={149} className={label}>Low</text>
      <text x={230} y={167} textAnchor="middle" className="fill-ink text-[11px] font-semibold">Down day</text>

      <text x={8} y={86} className="fill-muted text-[10px]">body</text>
      <line x1={34} x2={60} y1={83} y2={83} stroke="var(--line-2)" />
      <text x={8} y={140} className="fill-muted text-[10px]">wick</text>
      <line x1={32} x2={78} y1={137} y2={137} stroke="var(--line-2)" />
    </svg>
  )
}
