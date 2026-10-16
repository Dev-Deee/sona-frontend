import { describe, expect, it } from 'vitest'
import { addDecibels, subtractBackground } from '../gainSignal'
import { feedbackHeadroom, type FeedbackInput } from '../intelligibility'
import { doseStatus, formatHours, noiseDose, NOISE_STANDARDS } from '../powerElectrical'
import { planDelayTowers, type DelayPlanInput } from '../coverage'
import { speedOfSoundHumid } from '../acoustics'
import { error, expectAllFinite, value } from './helpers'

describe('addDecibels', () => {
  it('two equal sources add 3 dB; ten add 10 dB', () => {
    expect(value(addDecibels([90, 90])).total).toBeCloseTo(93.0103, 4)
    expect(value(addDecibels(Array(8).fill(80))).total).toBeCloseTo(89.0309, 4)
  })
  it('reports each source’s share of the power', () => {
    const r = value(addDecibels([90, 80, null]))
    expect(r.contributions).toHaveLength(2)
    expect(r.contributions[0].percent).toBeCloseTo(90.909, 3)
    expect(r.contributions[0].percent + r.contributions[1].percent).toBeCloseTo(100, 10)
  })
  it('validates', () => {
    expect(error(addDecibels([]))).toMatch(/at least one/)
    expect(addDecibels(Array(9).fill(80)).ok).toBe(false)
    expect(addDecibels([1e6]).ok).toBe(false)
  })
})

describe('subtractBackground', () => {
  it('corrects a reading for background noise', () => {
    const r = value(subtractBackground(90, 80))
    expect(r.source).toBeCloseTo(89.5424, 4)
    expect(r.correction).toBeCloseTo(-0.4576, 4)
  })
  it('warns within 3 dB and rejects background ≥ measured', () => {
    const close = subtractBackground(85, 83)
    expect(close.ok && close.warnings[0]).toMatch(/unreliable/)
    expect(error(subtractBackground(80, 80))).toMatch(/Background too high/)
    expect(subtractBackground(null, 80).ok).toBe(false)
  })
})

describe('feedbackHeadroom (PAG / NAG)', () => {
  const base: FeedbackInput = {
    talkerToMic: 0.3,
    speakerToMic: 6,
    speakerToListener: 15,
    talkerToListener: 20,
    openMics: 2,
    ead: 1,
    stabilityMargin: 6,
    suppressor: false,
  }
  it('computes PAG, NAG and margin', () => {
    const r = value(feedbackHeadroom(base))
    expect(r.pag).toBeCloseTo(20 * Math.log10((20 * 6) / (0.3 * 15)) - 10 * Math.log10(2) - 6, 10)
    expect(r.nag).toBeCloseTo(20 * Math.log10(20), 10)
    expect(r.margin).toBeCloseTo(r.pag - r.nag, 10)
    expect(r.status).toBe('Insufficient')
  })
  it('a closer mic and a suppressor improve the margin', () => {
    const r = value(feedbackHeadroom({ ...base, talkerToMic: 0.05, openMics: 1, suppressor: true }))
    expect(r.status).toBe('Adequate')
    const marginal = value(feedbackHeadroom({ ...base, talkerToMic: 0.12, openMics: 1 }))
    expect(marginal.margin).toBeGreaterThanOrEqual(0)
    expect(marginal.status).toBe('Marginal')
  })
  it('validates', () => {
    expect(feedbackHeadroom({ ...base, talkerToMic: 0 }).ok).toBe(false)
    expect(error(feedbackHeadroom({ ...base, openMics: 1.5 }))).toMatch(/whole number/)
  })
})

describe('noiseDose', () => {
  it('OSHA: 95 dB halves the 8 h allowance to 4 h', () => {
    const r = value(noiseDose(95, 240, 'OSHA'))
    expect(r.allowedHours).toBeCloseTo(4, 10)
    expect(r.dosePercent).toBeCloseTo(100, 10)
    expect(r.status).toBe('Near limit')
  })
  it('NIOSH: 100 dB for 1 h is 800% and needs 9 dB less', () => {
    const r = value(noiseDose(100, 60, 'NIOSH'))
    expect(r.allowedHours).toBeCloseTo(0.25, 10)
    expect(r.dosePercent).toBeCloseTo(400, 6)
    expect(r.status).toBe('Exceeded')
    expect(r.reductionDb).toBeCloseTo(6, 6)
    expect(r.remainingHours).toBe(0)
  })
  it('flags no risk at or below the limit', () => {
    const r = value(noiseDose(80, 120, 'WHO'))
    expect(r.noRisk).toBe(true)
    expect(r.status).toBe('Safe')
    expect(r.remainingHours).toBeCloseTo(38, 6)
  })
  it('warns above the pain threshold and rejects zero duration', () => {
    const r = noiseDose(145, 1, 'UK HSE')
    expect(r.ok && r.warnings[0]).toMatch(/pain threshold/)
    expect(error(noiseDose(90, 0, 'OSHA'))).toMatch(/greater than 0/)
  })
  it.each([
    [10, 'Safe'],
    [60, 'Monitor'],
    [90, 'Near limit'],
    [120, 'Exceeded'],
  ])('dose %s%% → %s', (d, s) => expect(doseStatus(d)).toBe(s))
  it('formats hours', () => {
    expect(formatHours(2.25)).toBe('2 h 15 min')
    expect(formatHours(0.75)).toBe('45 min')
    expect(formatHours(3)).toBe('3 h')
    expect(formatHours(0.001)).toBe('< 1 min')
    expect(formatHours(5000)).toBe('> 1,000 h')
  })
  it('defines all four standards', () => {
    expect(Object.keys(NOISE_STANDARDS)).toEqual(['WHO', 'OSHA', 'NIOSH', 'UK HSE'])
  })
})

describe('speedOfSoundHumid', () => {
  it('matches published humid-air values', () => {
    const r = value(speedOfSoundHumid(20, 50))
    expect(r.speed).toBeCloseTo(343.99, 1)
    expect(r.drySpeed).toBeCloseTo(343.36, 1)
    expect(value(speedOfSoundHumid(20, 0)).speed).toBeCloseTo(r.drySpeed, 10)
    const hot = value(speedOfSoundHumid(35, 80))
    expect(hot.speed - hot.drySpeed).toBeGreaterThan(2)
  })
  it('validates', () => {
    expect(error(speedOfSoundHumid(20, -1))).toMatch(/between 0 and 100/)
    expect(speedOfSoundHumid(-300, 50).ok).toBe(false)
    expect(speedOfSoundHumid(null, 50).ok).toBe(false)
  })
})

describe('planDelayTowers', () => {
  const base: DelayPlanInput = {
    venue: 'outdoor',
    pa: 'stereo',
    humidityPercent: 50,
    speakerType: 'passive',
    activeMode: 'maxSpl',
    mainMaxSpl: 140,
    depthM: 60,
    widthM: 40,
    mainHeightM: 8,
    mainBehindM: 2,
    earHeightM: 1.2,
    temperatureC: 20,
    mainSensitivity: 100,
    mainPowerW: 2000,
    mainCoverageDeg: 90,
    targetVarianceDb: 6,
    haasMs: 10,
    delayCoverageHDeg: 90,
    delayCoverageVDeg: 40,
    delayHeightM: 5,
    delaySensitivity: 98,
    delayPowerW: 1000,
    overlap: 0.1,
  }
  const c = value(speedOfSoundHumid(20, 50)).speed

  it('stage 1: throw and inverse-square loss to the back row', () => {
    const v = value(planDelayTowers(base)).venue
    expect(v.horizontalThrow).toBe(62)
    expect(v.verticalDrop).toBeCloseTo(6.8, 10)
    expect(v.totalThrow).toBeCloseTo(Math.hypot(62, 6.8), 10)
    expect(v.splLossBack).toBeCloseTo(20 * Math.log10(Math.hypot(62, 6.8)), 10)
  })

  it('stage 2: SPL front/back, variance and width check', () => {
    const m = value(value(planDelayTowers(base)).mains)
    expect(m.spl1m).toBeCloseTo(100 + 10 * Math.log10(2000), 10)
    expect(m.variance).toBeCloseTo(m.splFront - m.splBack, 10)
    expect(m.varianceCheck).toBe('fail')
    expect(m.widthAtBack).toBeCloseTo(124, 6)
    expect(m.coversWidth).toBe(true)
    expect(m.towerRecommended).toBe(true)
  })

  it('stage 3: placement clamped to 50–75% of depth, delay = path / c + Haas', () => {
    const p = value(value(planDelayTowers(base)).placement)
    expect(p.needed).toBe(true)
    expect(p.fromFront).toBe(30)
    expect(p.fromBack).toBe(30)
    expect(p.mainToTower).toBeCloseTo(Math.hypot(32, 6.8), 10)
    expect(p.delaySettingMs).toBeCloseTo((Math.hypot(32, 6.8) / c) * 1000 + 10, 10)
  })

  it('stage 3: no tower needed when the mains stay within the target variance', () => {
    const small = value(planDelayTowers({ ...base, depthM: 6, mainBehindM: 4 }))
    expect(value(small.placement).needed).toBe(false)
    expect(error(small.speaker)).toMatch(/no delay tower needed/)
    expect(small.towers.ok).toBe(false)
  })

  it('stage 4: delay throw, SPL match, aim angle and indoor vertical check', () => {
    const s = value(value(planDelayTowers(base)).speaker)
    expect(s.throwToBack).toBe(30)
    expect(s.aimAngle).toBeCloseTo((Math.atan2(3.8, 30) * 180) / Math.PI, 10)
    expect(s.widthAtBack).toBeCloseTo(60, 6)
    expect(s.verticalCheck).toBeNull()
    expect(['pass', 'warn', 'fail']).toContain(s.matchCheck)
    const indoor = value(
      value(planDelayTowers({ ...base, venue: 'indoor', delayCoverageVDeg: 5 })).speaker,
    )
    expect(indoor.verticalCheck).toBe('warn')
  })

  it('stage 4: warns when the delay overpowers the mains', () => {
    const loud = value(
      planDelayTowers({ ...base, delayPowerW: 20000, delaySensitivity: 110 }),
    ).speaker
    expect(loud.ok && loud.value.matchCheck).toBe('warn')
    expect(loud.ok && loud.warnings[0]).toMatch(/overpower/)
  })

  it('stage 5: number of towers and spacing', () => {
    const t = value(value(planDelayTowers(base)).towers)
    expect(t.effectiveWidth).toBeCloseTo(54, 6)
    expect(t.towers).toBe(1)
    const wide = value(value(planDelayTowers({ ...base, widthM: 300 })).towers)
    expect(wide.towers).toBe(6)
    expect(wide.spacing).toBeCloseTo(50, 10)
    expect(value(planDelayTowers({ ...base, widthM: 300 })).towers.ok).toBe(true)
  })

  it('stage 1: humidity raises the speed of sound slightly', () => {
    const v = value(planDelayTowers(base)).venue
    expect(v.speed).toBeGreaterThan(v.drySpeed)
    expect(v.speed - v.drySpeed).toBeLessThan(1)
    expect(planDelayTowers({ ...base, humidityPercent: 120 }).ok).toBe(false)
  })

  it('stage 2: active speakers can use the spec-sheet max SPL directly', () => {
    const m = value(
      value(
        planDelayTowers({ ...base, speakerType: 'active', activeMode: 'maxSpl', mainMaxSpl: 140 }),
      ).mains,
    )
    expect(m.spl1m).toBe(140)
    const viaPower = value(
      value(planDelayTowers({ ...base, speakerType: 'active', activeMode: 'sensitivity' })).mains,
    )
    expect(viaPower.spl1m).toBeCloseTo(100 + 10 * Math.log10(2000), 10)
    expect(
      value(
        planDelayTowers({ ...base, speakerType: 'active', activeMode: 'maxSpl', mainMaxSpl: null }),
      ).mains.ok,
    ).toBe(false)
  })

  it('never returns NaN and validates input', () => {
    expectAllFinite(value(planDelayTowers(base)).venue)
    expect(error(planDelayTowers({ ...base, depthM: 0 }))).toMatch(/audience depth/)
    expect(planDelayTowers({ ...base, temperatureC: null }).ok).toBe(false)
    const noMains = value(planDelayTowers({ ...base, mainPowerW: 0 }))
    expect(noMains.mains.ok).toBe(false)
    expect(error(noMains.placement)).toMatch(/main coverage/)
    expect(value(planDelayTowers({ ...base, mainCoverageDeg: 200 })).mains.ok).toBe(false)
    expect(value(planDelayTowers({ ...base, targetVarianceDb: -1 })).placement.ok).toBe(false)
    expect(value(planDelayTowers({ ...base, delayPowerW: null })).speaker.ok).toBe(false)
    expect(value(planDelayTowers({ ...base, delayCoverageHDeg: 190 })).speaker.ok).toBe(false)
  })
})
