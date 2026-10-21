import { describe, expect, it } from 'vitest'
import {
  aspectRatios,
  asymmetricCoverage,
  inverseSquare,
  mountedHeight,
  needDelays,
  requiredCoverageAngle,
} from '../coverage'
import {
  beamingFrequency,
  combFilter,
  constantCurvature,
  inlineSubArray,
  maxSubSpacing,
  speakerCombFilter,
  subArraySettings,
  uncoupledSpacing,
} from '../arrays'
import { speedOfSound } from '../acoustics'
import { error, expectAllFinite, value } from './helpers'

const c20 = () => value(speedOfSound(20)).metersPerSecond

describe('inverseSquare', () => {
  it('loses 6.02 dB per doubling of distance', () => {
    const r = value(inverseSquare(100, 1, 2))
    expect(r.spl).toBeCloseTo(93.979, 3)
    expect(r.change).toBeCloseTo(-6.0206, 4)
  })
  it('rejects zero distances', () => {
    expect(error(inverseSquare(100, 0, 2))).toMatch(/reference distance/)
    expect(error(inverseSquare(100, 1, 0))).toMatch(/target distance/)
    expect(inverseSquare(null, 1, 2).ok).toBe(false)
  })
})

describe('aspectRatios', () => {
  it('matches McCarthy values for 90°', () => {
    const r = value(aspectRatios(3, 4, 90))
    expect(r.far).toBeCloseTo(Math.SQRT2, 10)
    expect(r.lar).toBeCloseTo(2, 10)
    expect(r.directDistance).toBeCloseTo(5, 10)
    expect(r.coverageWidth).toBeCloseTo(10, 10)
    expect(r.aimAngle).toBeCloseTo(36.87, 2)
  })
  it('rejects 180° or more', () => {
    expect(error(aspectRatios(1, 1, 180))).toMatch(/less than 180/)
    expect(aspectRatios(1, 0, 90).ok).toBe(false)
  })
})

describe('requiredCoverageAngle', () => {
  it('needs 90° to cover 20 m wide at 10 m', () => {
    expect(value(requiredCoverageAngle(20, 10))).toBeCloseTo(90, 10)
  })
  it('rejects zero distance', () => {
    expect(requiredCoverageAngle(20, 0).ok).toBe(false)
  })
})

describe('asymmetricCoverage', () => {
  it('computes aim angles and range ratio', () => {
    const r = value(asymmetricCoverage(5, 40, 6))
    expect(r.upperSplay).toBeCloseTo((Math.atan2(6, 40) * 180) / Math.PI, 10)
    expect(r.lowerSplay).toBeCloseTo((Math.atan2(6, 5) * 180) / Math.PI, 10)
    expect(r.totalCoverage).toBeCloseTo(r.lowerSplay - r.upperSplay, 10)
    expect(r.rangeRatioDb).toBeCloseTo(20 * Math.log10(Math.hypot(6, 40) / Math.hypot(6, 5)), 10)
    expect(r.description).toMatch(/Strongly asymmetric/)
  })
  it('classifies near-symmetric and moderate cases', () => {
    expect(value(asymmetricCoverage(30, 34, 2)).description).toMatch(/Near-symmetric/)
    expect(value(asymmetricCoverage(10, 20, 2)).description).toMatch(/Moderately/)
  })
  it('requires far > near', () => {
    expect(error(asymmetricCoverage(20, 10, 5))).toMatch(/further/)
    expect(asymmetricCoverage(0, 10, 5).ok).toBe(false)
  })
})

describe('speakerCombFilter', () => {
  const base = { spacingM: 4, distanceM: 10, temperatureC: 20 }
  it('finds path difference, notches and ripple for identical speakers', () => {
    const r = value(speakerCombFilter({ ...base, offsetM: 3 }))
    expect(r.pathA).toBeCloseTo(Math.hypot(5, 10), 10)
    expect(r.pathB).toBeCloseTo(Math.hypot(1, 10), 10)
    expect(r.earlier).toBe('B')
    expect(r.firstNotchHz).toBeCloseTo(c20() / (2 * (r.pathA - r.pathB)), 8)
    expect(r.levelDifferenceDb).toBeCloseTo(20 * Math.log10(r.pathA / r.pathB), 10)
    const ratio = 10 ** (-r.levelDifferenceDb / 20)
    expect(r.depthDb).toBeCloseTo(20 * Math.log10((1 + ratio) / (1 - ratio)), 10)
    expect(r.severity).toBe('severe')
  })
  it('accounts for different speakers and rates severity', () => {
    const louderA = value(speakerCombFilter({ ...base, offsetM: 3, splA: 142, splB: 132 }))
    expect(louderA.severity).toBe('noticeable')
    expect(louderA.levelDifferenceDb).toBeLessThan(0)
    expect(value(speakerCombFilter({ ...base, offsetM: 3, splA: 142, splB: 120 })).severity).toBe(
      'mild',
    )
    const near = value(speakerCombFilter({ ...base, offsetM: -0.2 }))
    expect(near.earlier).toBe('A')
    expect(near.severity).toBe('severe')
    // Far off to one side, the nearer speaker dominates.
    const side = value(
      speakerCombFilter({ spacingM: 10, distanceM: 2, offsetM: 5, temperatureC: 20 }),
    )
    expect(side.severity).toBe('mild')
  })
  it('rejects bad input and the dead-centre seat', () => {
    expect(speakerCombFilter({ ...base, offsetM: 0 }).ok).toBe(false)
    expect(speakerCombFilter({ ...base, spacingM: 0, offsetM: 1 }).ok).toBe(false)
    expect(speakerCombFilter({ ...base, offsetM: null }).ok).toBe(false)
    expect(speakerCombFilter({ ...base, offsetM: 1, temperatureC: null }).ok).toBe(false)
  })
})

describe('needDelays', () => {
  const base = { mainHeight: 8, delayHeight: 4, earHeight: 1.2, temperatureC: 20 }
  it('recommends delays beyond 20 ms difference', () => {
    const r = value(needDelays({ ...base, mainDistance: 40, delayDistance: 5 }))
    expect(r.mainPath).toBeCloseTo(Math.hypot(6.8, 40), 10)
    expect(r.differenceMs).toBeGreaterThan(20)
    expect(r.beneficial).toBe(true)
    expect(r.recommendation).toMatch(/Delay beneficial/)
    expect(r.levelDifferenceDb).toBeGreaterThan(0)
  })
  it('compares real speakers when both max SPL figures are given', () => {
    const same = value(needDelays({ ...base, mainDistance: 40, delayDistance: 5 }))
    expect(same.mainSplAtListener).toBeNull()
    const r = value(
      needDelays({ ...base, mainDistance: 40, delayDistance: 5, mainSpl1m: 140, delaySpl1m: 128 }),
    )
    expect(r.levelDifferenceDb).toBeCloseTo(same.levelDifferenceDb - 12, 10)
    expect(r.mainSplAtListener).toBeCloseTo(140 - 20 * Math.log10(r.mainPath), 10)
    expect(r.delaySplAtListener).toBeCloseTo(128 - 20 * Math.log10(r.delayPath), 10)
    // Only one figure: level difference still assumes the same speaker.
    const one = value(needDelays({ ...base, mainDistance: 40, delayDistance: 5, mainSpl1m: 140 }))
    expect(one.levelDifferenceDb).toBeCloseTo(same.levelDifferenceDb, 10)
    expect(one.delaySplAtListener).toBeNull()
  })
  it('does not recommend delays for small differences', () => {
    const r = value(needDelays({ ...base, mainDistance: 10, delayDistance: 8 }))
    expect(r.beneficial).toBe(false)
    expect(r.recommendation).toMatch(/Not needed/)
    const reversed = value(needDelays({ ...base, mainDistance: 5, delayDistance: 30 }))
    expect(reversed.recommendation).toMatch(/mains arrive first/)
  })
  it('validates inputs', () => {
    expect(needDelays({ ...base, mainDistance: 0, delayDistance: 5 }).ok).toBe(false)
    expect(needDelays({ ...base, temperatureC: null, mainDistance: 10, delayDistance: 5 }).ok).toBe(
      false,
    )
  })
})

describe('combFilter', () => {
  it('first notch at c / (2Δ)', () => {
    const r = value(combFilter(10, 11, 20))
    expect(r.pathDifference).toBeCloseTo(1, 10)
    expect(r.firstNotchHz).toBeCloseTo(c20() / 2, 10)
    expect(r.notchSpacingHz).toBeCloseTo(c20(), 10)
    expect(r.halfWavelength).toBeCloseTo(1, 10)
    expect(r.timeOffsetMs).toBeCloseTo(1000 / c20(), 10)
  })
  it('equal paths are an error, not Infinity', () => {
    expect(error(combFilter(5, 5, 20))).toMatch(/equal/)
    expect(combFilter(0, 5, 20).ok).toBe(false)
    expect(combFilter(4, 5, null).ok).toBe(false)
  })
})

describe('constantCurvature', () => {
  it('computes geometry and throw', () => {
    const r = value(
      constantCurvature({ boxes: 8, splayDeg: 5, boxHeightM: 0.35, trimHeightM: 9, topTiltDeg: 2 }),
    )
    expect(r.arcLength).toBeCloseTo(2.8, 10)
    expect(r.includedAngle).toBe(35)
    expect(r.verticalCoverage).toBe(40)
    expect(r.radius).toBeCloseTo(0.35 / (2 * Math.sin((2.5 * Math.PI) / 180)), 10)
    expect(r.bottomAimAngle).toBe(37)
    expect(r.topThrow).toBeCloseTo(9 / Math.tan((2 * Math.PI) / 180), 6)
    expect(r.bottomThrow).toBeCloseTo(9 / Math.tan((37 * Math.PI) / 180), 6)
  })
  it('handles straight arrays and upward aim', () => {
    const r = constantCurvature({
      boxes: 4,
      splayDeg: 0,
      boxHeightM: 0.4,
      trimHeightM: 6,
      topTiltDeg: 0,
    })
    expect(value(r).radius).toBeNull()
    expect(value(r).topThrow).toBeNull()
    expect(r.ok && r.warnings[0]).toMatch(/horizon/)
    expect(value(constantCurvature({ boxes: 4, splayDeg: 2, boxHeightM: 0.4 })).topThrow).toBeNull()
  })
  it('validates', () => {
    expect(error(constantCurvature({ boxes: 2.5, splayDeg: 2, boxHeightM: 0.4 }))).toMatch(/whole/)
    expect(constantCurvature({ boxes: 0, splayDeg: 2, boxHeightM: 0.4 }).ok).toBe(false)
  })
})

describe('beamingFrequency / maxSubSpacing', () => {
  it('f = c / h', () => {
    expect(value(beamingFrequency(0.5, 20))).toBeCloseTo(c20() / 0.5, 10)
    expect(beamingFrequency(0, 20).ok).toBe(false)
    expect(beamingFrequency(0.5, null).ok).toBe(false)
  })
  it('spacing = c / (2f)', () => {
    expect(value(maxSubSpacing(100, 20))).toBeCloseTo(c20() / 200, 10)
    expect(maxSubSpacing(0, 20).ok).toBe(false)
    expect(maxSubSpacing(100, null).ok).toBe(false)
  })
})

describe('inlineSubArray', () => {
  it('a two-box gradient with delay = spacing/c nulls the rear', () => {
    const spacing = 1
    const delay = (spacing / c20()) * 1000
    const r = value(
      inlineSubArray({
        subs: 2,
        spacingM: spacing,
        delayMs: delay,
        frequencyHz: 63,
        mode: 'gradient',
        temperatureC: 20,
      }),
    )
    expect(r.idealDelayMs).toBeCloseTo(delay, 10)
    expect(r.frontToBackDb).toBeGreaterThan(40)
    expect(r.nullDepthDb).toBeLessThan(-40)
    expectAllFinite(r)
  })
  it('end-fire sums coherently to the front', () => {
    const delay = (1 / c20()) * 1000
    const r = value(
      inlineSubArray({
        subs: 4,
        spacingM: 1,
        delayMs: delay,
        frequencyHz: 50,
        mode: 'endfire',
        temperatureC: 20,
      }),
    )
    expect(r.frontGainDb).toBeCloseTo(20 * Math.log10(4), 6)
    expect(r.frontToBackDb).toBeGreaterThan(0)
  })
  it('validates', () => {
    const base = {
      subs: 2,
      spacingM: 1,
      delayMs: 2.9,
      frequencyHz: 63,
      mode: 'gradient' as const,
      temperatureC: 20,
    }
    expect(error(inlineSubArray({ ...base, subs: 1 }))).toMatch(/at least 2/)
    expect(error(inlineSubArray({ ...base, subs: 20 }))).toMatch(/pair of 2 subs/)
    expect(error(inlineSubArray({ ...base, subs: 9, mode: 'endfire' }))).toMatch(/more than 8/)
    expect(inlineSubArray({ ...base, spacingM: 0 }).ok).toBe(false)
    expect(inlineSubArray({ ...base, temperatureC: null }).ok).toBe(false)
  })
})

describe('subArraySettings', () => {
  it('gradient: rear sub delayed and inverted', () => {
    expect(subArraySettings('gradient', 2, 3.5)).toEqual([
      { position: 1, delayMs: 0, inverted: false },
      { position: 2, delayMs: 3.5, inverted: true },
    ])
  })
  it('end-fire: front sub delayed most, all in polarity', () => {
    expect(subArraySettings('endfire', 3, 2).map((s) => [s.delayMs, s.inverted])).toEqual([
      [4, false],
      [2, false],
      [0, false],
    ])
  })
})

describe('uncoupledSpacing', () => {
  it('spacing = 2h·tan(θ/2)', () => {
    expect(value(uncoupledSpacing(90, 3)).spacing).toBeCloseTo(6, 10)
  })
  it('validates angle range', () => {
    expect(error(uncoupledSpacing(180, 3))).toMatch(/between/)
    expect(uncoupledSpacing(90, 0).ok).toBe(false)
  })
})

describe('mountedHeight', () => {
  it('uses the array centre when flown and the stack middle when ground-stacked', () => {
    expect(mountedHeight('flown', 8, 1.2, 2)).toBe(8)
    expect(mountedHeight('ground', 8, 1.2, 2)).toBeCloseTo(2.2, 10)
    expect(mountedHeight('ground', 8, 0, 1.6)).toBeCloseTo(0.8, 10)
  })
  it('returns null for missing or impossible stacks', () => {
    expect(mountedHeight('flown', null, 1, 1)).toBeNull()
    expect(mountedHeight('ground', 8, null, 2)).toBeNull()
    expect(mountedHeight('ground', 8, 1, 0)).toBeNull()
    expect(mountedHeight('ground', 8, -1, 2)).toBeNull()
  })
})
