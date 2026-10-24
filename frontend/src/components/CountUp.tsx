import { useCountUp } from '../lib/motion'

/** A number that counts up once when it appears. Screen readers get the final value straight away. */
export function CountUp({ value }: { value: string }) {
  const shown = useCountUp(value)
  if (shown === value) return <>{value}</>
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </>
  )
}
