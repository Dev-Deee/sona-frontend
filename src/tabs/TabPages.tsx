import { CriticalDistanceCard } from '../components/calculator/cards/acoustics'

/** The Acoustics critical-distance calculator, with its own saved inputs on the Intelligibility tab. */
export function IntelligibilityCriticalDistance() {
  return <CriticalDistanceCard calcId="intelligibility.criticalDistance" />
}
