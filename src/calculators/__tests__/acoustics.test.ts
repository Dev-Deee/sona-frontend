import { describe, expect, it } from 'vitest'
import {
  criticalDistance,
  directivityQ,
  frequencyToWavelength,
  itdg,
  roomModes,
  rt60,
  rt60Rating,
  speedOfSound,
  speedOrFail,
} from '../acoustics'
import { mToFt } from '../units'
import { error, expectAllFinite, value } from './helpers'

describe('speedOfSound', () => {
  it('is 331.3 m/s at 0 °C and ~343 m/s at 20 °C', () => {
    expect(value(speedOfSound(0)).metersPerSecond).toBeCloseTo(331.3, 6)
    expect(value(speedOfSound(20)).metersPerSecond).toBeCloseTo(343.21, 2)
  })

  it('derives ft/s and ms per unit distance', () => {
    const s = value(speedOfSound(20))
    expect(s.feetPerSecond).toBeCloseTo(s.metersPerSecond * 3.28084, 9)
    expect(s.msPerMeter).toBeCloseTo(1000 / s.metersPerSecond, 9)
    expect(s.msPerFoot).toBeCloseTo(s.msPerMeter / 3.28084, 9)
  })

  it('handles negative temperatures', () => {
    const s = speedOfSound(-20)
    expect(s.ok && s.warnings).toEqual([])
    expect(value(s).metersPerSecond).toBeCloseTo(318.94, 1)
  })

  it('clamps below absolute zero and warns instead of returning NaN', () => {
    const r = speedOfSound(-300)
    expect(r.ok).toBe(false)
    expect(error(r)).toMatch(/absolute zero/)
    const exact = speedOfSound(-273.15)
    expect(exact.ok).toBe(false)
  })

  it('warns when clamping a temperature that is still usable after clamping', () => {
    // Clamping to −273.15 yields c = 0, which is rejected; a value just above absolute zero is fine.
    const r = speedOfSound(-273)
    expect(r.ok).toBe(true)
    expectAllFinite(value(r))
  })

  it('requires a temperature', () => {
    expect(error(speedOfSound(null))).toMatch(/temperature/)
    expect(speedOrFail(undefined)).toHaveProperty('error')
  })
})

describe('frequencyToWavelength', () => {
  it('80 Hz at 21.6 °C follows c = 331.3·√(1+T/273.15)', () => {
    // c = 344.150 m/s → λ = 4.302 m. (The spec's 4.306 m does not match its own formula; see README.)
    const r = value(frequencyToWavelength(80, 21.6))
    expect(r.speed).toBeCloseTo(344.15, 2)
    expect(Math.abs(r.wavelength - 4.302)).toBeLessThan(0.001)
    expect(r.halfWavelength).toBeCloseTo(r.wavelength / 2, 12)
    expect(r.quarterWavelength).toBeCloseTo(r.wavelength / 4, 12)
    expect(r.periodMs).toBeCloseTo(12.5, 12)
  })

  it('computes samples per period at the standard sample rates', () => {
    const r = value(frequencyToWavelength(1000, 20))
    expect(r.samples).toEqual([
      { sampleRate: 44100, samples: 44.1 },
      { sampleRate: 48000, samples: 48 },
      { sampleRate: 88200, samples: 88.2 },
      { sampleRate: 96000, samples: 96 },
    ])
  })

  it('returns an error for 0 Hz rather than dividing by zero', () => {
    expect(error(frequencyToWavelength(0, 20))).toMatch(/greater than 0/)
    expect(error(frequencyToWavelength(-5, 20))).toMatch(/greater than 0/)
    expect(error(frequencyToWavelength(null, 20))).toMatch(/Enter/)
  })

  it('still computes for very large frequencies', () => {
    const r = value(frequencyToWavelength(100000, 20))
    expect(r.wavelength).toBeCloseTo(0.0034321, 6)
    expectAllFinite(r)
  })

  it('propagates temperature problems', () => {
    expect(frequencyToWavelength(100, null).ok).toBe(false)
  })

  it('imperial wavelength is the metric wavelength × 3.28084', () => {
    const r = value(frequencyToWavelength(80, 21.6))
    expect(mToFt(r.wavelength)).toBeCloseTo(14.114, 3)
  })
})

describe('rt60', () => {
  it('Sabine: 0.161·V/A', () => {
    const r = value(rt60(2000, 300, 'sabine'))
    expect(r.rt60).toBeCloseTo(1.0733, 4)
    expect(r.rating).toBe('Good')
  })

  it('Eyring is shorter than Sabine for the same room', () => {
    const sabine = value(rt60(2000, 300, 'sabine')).rt60
    const eyring = value(rt60(2000, 300, 'eyring', 1000))
    expect(eyring.averageAbsorption).toBeCloseTo(0.3, 10)
    expect(eyring.rt60).toBeCloseTo((0.161 * 2000) / (-1000 * Math.log(0.7)), 10)
    expect(eyring.rt60).toBeLessThan(sabine)
  })

  it('validates inputs', () => {
    expect(error(rt60(0, 10, 'sabine'))).toMatch(/volume/)
    expect(error(rt60(100, 0, 'sabine'))).toMatch(/absorption/)
    expect(error(rt60(100, 10, 'eyring'))).toMatch(/surface/)
    expect(error(rt60(100, 50, 'eyring', 50))).toMatch(/ā < 1/)
  })

  it.each([
    [0.5, 'Excellent'],
    [1.2, 'Good'],
    [2, 'Moderate'],
    [3, 'Poor'],
    [3.5, 'Very Poor'],
  ])('rates %s s as %s', (t, rating) => {
    expect(rt60Rating(t)).toBe(rating)
  })
})

describe('criticalDistance', () => {
  it('Dc = 0.057·√(V/RT60)', () => {
    expect(value(criticalDistance(5000, 2))).toBeCloseTo(0.057 * 50, 10)
  })
  it('rejects zero RT60', () => {
    expect(error(criticalDistance(5000, 0))).toMatch(/RT60/)
  })
})

describe('roomModes', () => {
  it('returns 5 axial modes per dimension', () => {
    const r = value(roomModes(10, 5, 3, 20))
    const c = value(speedOfSound(20)).metersPerSecond
    expect(r.length).toHaveLength(5)
    expect(r.length[0]).toBeCloseTo(c / 20, 10)
    expect(r.width[1]).toBeCloseTo((c / 2) * (2 / 5), 10)
    expect(r.height[4]).toBeCloseTo((c / 2) * (5 / 3), 10)
  })
  it('rejects zero dimensions', () => {
    expect(error(roomModes(10, 0, 3, 20))).toMatch(/width/)
    expect(roomModes(10, 5, 3, null).ok).toBe(false)
  })
})

describe('itdg', () => {
  it('converts distance to milliseconds', () => {
    const c = value(speedOfSound(20)).metersPerSecond
    expect(value(itdg(10, 20))).toBeCloseTo((10 / c) * 1000, 10)
  })
  it('rejects zero distance', () => {
    expect(itdg(0, 20).ok).toBe(false)
    expect(itdg(5, null).ok).toBe(false)
  })
})

describe('directivityQ', () => {
  it('estimates Q from H × V coverage (Molloy)', () => {
    expect(value(directivityQ(90, 60))).toBeCloseTo(
      180 / ((Math.asin(Math.SQRT1_2 * 0.5) * 180) / Math.PI),
      10,
    )
    expect(value(directivityQ(180, 180))).toBeCloseTo(2, 10)
  })
  it('rejects missing or impossible angles', () => {
    expect(error(directivityQ(null, 60))).toMatch(/horizontal coverage/)
    expect(error(directivityQ(200, 60))).toMatch(/180°/)
  })
})
