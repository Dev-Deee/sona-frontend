import { describe, expect, it } from 'vitest'
import {
  awgToMm2,
  cableLoss,
  dbToLinear,
  DBV_TO_DBU,
  gainStructure,
  linearToDb,
  signalSummation,
  speakerHeadroom,
  stageHealth,
  type GainStructureInput,
} from '../gainSignal'
import { alcons, alconsRating, estimateSti, stiRating } from '../intelligibility'
import { error, expectAllFinite, value } from './helpers'

describe('dB ↔ linear', () => {
  it('uses 20·log for voltage/SPL and 10·log for power', () => {
    expect(value(dbToLinear(6, 'voltage'))).toBeCloseTo(1.9953, 4)
    expect(value(dbToLinear(20, 'spl'))).toBeCloseTo(10, 10)
    expect(value(dbToLinear(3, 'power'))).toBeCloseTo(1.9953, 4)
    expect(value(linearToDb(2, 'voltage'))).toBeCloseTo(6.0206, 4)
    expect(value(linearToDb(2, 'power'))).toBeCloseTo(3.0103, 4)
  })
  it('round-trips', () => {
    for (const db of [-60, -3, 0, 12.5]) {
      expect(value(linearToDb(value(dbToLinear(db, 'voltage')), 'voltage'))).toBeCloseTo(db, 10)
    }
  })
  it('rejects non-positive linear values and absurd dB', () => {
    expect(error(linearToDb(0, 'voltage'))).toMatch(/greater than 0/)
    expect(error(dbToLinear(100000, 'power'))).toMatch(/too large/)
    expect(dbToLinear(null, 'power').ok).toBe(false)
  })
})

describe('signalSummation', () => {
  it('2 correlated sources = +6.02 dB, uncorrelated +3.01 dB', () => {
    const r = value(signalSummation(2))
    expect(r.correlatedDb).toBeCloseTo(6.0206, 4)
    expect(r.uncorrelatedDb).toBeCloseTo(3.0103, 4)
    expect(value(signalSummation(1)).correlatedDb).toBe(0)
  })
  it('accepts 1–16 whole numbers only', () => {
    expect(signalSummation(17).ok).toBe(false)
    expect(signalSummation(2.5).ok).toBe(false)
    expect(signalSummation(0).ok).toBe(false)
  })
})

describe('speakerHeadroom', () => {
  it('classifies safe, marginal and overpowered', () => {
    expect(value(speakerHeadroom(250, 500, 1000)).status).toBe('Safe')
    expect(value(speakerHeadroom(250, 500, 1000)).vsContinuousDb).toBeCloseTo(3.0103, 4)
    expect(value(speakerHeadroom(800, 500, 1000)).status).toBe('Marginal')
    const over = value(speakerHeadroom(2000, 500, 1000))
    expect(over.status).toBe('Overpowered')
    expect(over.vsProgramDb).toBeCloseTo(-3.0103, 4)
  })
  it('validates', () => {
    expect(speakerHeadroom(0, 500, 1000).ok).toBe(false)
    expect(error(speakerHeadroom(100, 500, 400))).toMatch(/Program/)
  })
})

describe('gainStructure', () => {
  const input: GainStructureInput = {
    sourceLevel: -50,
    sourceUnit: 'dBu',
    preampGain: 50,
    processingLoss: 0,
    faderLevel: 0,
    ampSensitivityDbu: 4,
    ampGainDb: 32,
    speakerSensitivity: 98,
    distanceM: 10,
  }

  it('cascades levels and computes SPL', () => {
    const r = value(gainStructure(input))
    expect(r.stages.map((s) => s.outDbu)).toEqual([0, 0, 0, 32])
    expect(r.stages[0].headroomDb).toBe(24)
    expect(r.stages[3].headroomDb).toBe(4)
    expect(r.stages[3].health).toBe('warning')
    const volts = 0.7746 * 10 ** (32 / 20)
    expect(r.ampOutputVolts).toBeCloseTo(volts, 6)
    expect(r.ampOutputWatts).toBeCloseTo((volts * volts) / 8, 6)
    expect(r.splAtListener).toBeCloseTo(98 + 10 * Math.log10((volts * volts) / 8) - 20, 6)
    expect(r.ampClipping).toBe(false)
  })

  it('flags clipping and limits amp output at its sensitivity', () => {
    const r = gainStructure({ ...input, preampGain: 80, impedance: 4 })
    expect(r.ok && r.warnings[0]).toMatch(/clipped/)
    const v = value(r)
    expect(v.stages[0].health).toBe('clip')
    expect(v.ampClipping).toBe(true)
    expect(v.stages[3].outDbu).toBe(4 + 32)
  })

  it('converts dBV sources to dBu', () => {
    const r = value(gainStructure({ ...input, sourceUnit: 'dBV', sourceLevel: 0, preampGain: 0 }))
    expect(r.stages[0].inDbu).toBeCloseTo(DBV_TO_DBU, 10)
    expect(DBV_TO_DBU).toBeCloseTo(2.218, 3)
  })

  it('validates', () => {
    expect(gainStructure({ ...input, distanceM: 0 }).ok).toBe(false)
    expect(gainStructure({ ...input, processingLoss: -1 }).ok).toBe(false)
  })

  it('stage health thresholds', () => {
    expect(stageHealth(10)).toBe('ok')
    expect(stageHealth(5.9)).toBe('warning')
    expect(stageHealth(0)).toBe('clip')
  })
})

describe('cableLoss', () => {
  it('AWG 12 ≈ 3.31 mm²', () => {
    expect(awgToMm2(12)).toBeCloseTo(3.31, 2)
  })

  it('computes loop resistance and loss', () => {
    const r = value(cableLoss({ gauge: 2.5, gaugeUnit: 'mm2', lengthM: 30, loadOhms: 8 }))
    const R = (0.0172 / 2.5) * 2 * 30
    expect(r.resistance).toBeCloseTo(R, 10)
    expect(r.voltageDropPercent).toBeCloseTo((R / (8 + R)) * 100, 10)
    expect(r.powerLossDb).toBeCloseTo(20 * Math.log10(1 - R / (8 + R)), 10)
    expect(r.dampingFactor).toBeCloseTo(8 / R, 10)
  })

  it('zero length gives zero loss with no NaN', () => {
    const r = value(cableLoss({ gauge: 12, gaugeUnit: 'awg', lengthM: 0, loadOhms: 8 }))
    expect(r.resistance).toBe(0)
    expect(r.powerLossDb).toBe(0)
    expect(r.voltageDropPercent).toBe(0)
    expect(r.dampingFactor).toBeNull()
  })

  it('validates gauge and load', () => {
    expect(cableLoss({ gauge: 50, gaugeUnit: 'awg', lengthM: 10, loadOhms: 8 }).ok).toBe(false)
    expect(cableLoss({ gauge: 0, gaugeUnit: 'mm2', lengthM: 10, loadOhms: 8 }).ok).toBe(false)
    expect(cableLoss({ gauge: 12, gaugeUnit: 'awg', lengthM: 10, loadOhms: 0 }).ok).toBe(false)
  })
})

describe('STI', () => {
  it('computes and clamps', () => {
    expect(value(estimateSti(30, 1)).sti).toBeCloseTo(1, 10)
    expect(value(estimateSti(15, 1)).sti).toBeCloseTo(0.75, 10)
    expect(value(estimateSti(60, 0)).sti).toBe(1)
    expect(value(estimateSti(-60, 1)).sti).toBe(0)
  })
  it.each([
    [0.2, 'Bad'],
    [0.4, 'Poor'],
    [0.5, 'Fair'],
    [0.7, 'Good'],
    [0.75, 'Excellent'],
  ])('rates %s as %s', (sti, rating) => expect(stiRating(sti)).toBe(rating))
  it('validates', () => {
    expect(estimateSti(null, 1).ok).toBe(false)
    expect(estimateSti(10, -1).ok).toBe(false)
  })
})

describe('%ALcons', () => {
  it('0 dB D/R (at Dc) with 1 source', () => {
    const r = value(alcons(1.5, 0, 1))
    expect(r.alcons).toBeCloseTo(0.652 * 1.5, 10)
    expect(r.rating).toBe('Excellent')
    expectAllFinite(r)
  })
  it('caps at the 9·RT60 far-field limit', () => {
    expect(value(alcons(2, -30, 1)).alcons).toBe(18)
    expect(value(alcons(2, -30, 1)).rating).toBe('Bad')
  })
  it.each([
    [2, 'Excellent'],
    [5, 'Good'],
    [10, 'Fair'],
    [14, 'Poor'],
    [20, 'Bad'],
  ])('rates %s%% as %s', (v, rating) => expect(alconsRating(v)).toBe(rating))
  it('validates', () => {
    expect(alcons(0, 0, 1).ok).toBe(false)
    expect(alcons(1, 0, 0).ok).toBe(false)
  })
})
