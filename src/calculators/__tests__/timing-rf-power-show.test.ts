import { describe, expect, it } from 'vitest'
import { bpmToDelay, delayToDistance, FRAME_RATES, frameSync, phaseDelay } from '../timingSync'
import {
  freeSpacePathLoss,
  linkBudget,
  linkStatus,
  thirdOrderIntermod,
  type LinkBudgetInput,
} from '../rfWireless'
import {
  ampPowerToSpl,
  circuitLoad,
  constantVoltageLine,
  splToAmpPower,
  totalImpedance,
} from '../powerElectrical'
import { inputListToCsv, moveItem, riggingLoad, type InputChannel } from '../showTools'
import { speedOfSound } from '../acoustics'
import { error, value } from './helpers'

describe('timing', () => {
  it('phase delay', () => {
    expect(value(phaseDelay(180, 100))).toBeCloseTo(5, 10)
    expect(value(phaseDelay(-90, 1000))).toBeCloseTo(-0.25, 10)
    expect(phaseDelay(90, 0).ok).toBe(false)
  })

  it('delay to distance', () => {
    const c = value(speedOfSound(20)).metersPerSecond
    expect(value(delayToDistance(10, 20))).toBeCloseTo(c / 100, 10)
    expect(value(delayToDistance(0, 20))).toBe(0)
    expect(delayToDistance(-1, 20).ok).toBe(false)
    expect(delayToDistance(null, 20).ok).toBe(false)
    expect(delayToDistance(5, null).ok).toBe(false)
  })

  it('BPM table at 120 BPM', () => {
    const table = value(bpmToDelay(120))
    const byName = Object.fromEntries(table.map((n) => [n.name, n.ms]))
    expect(byName['Quarter note']).toBe(500)
    expect(byName['Whole note']).toBe(2000)
    expect(byName['Dotted 8th']).toBe(375)
    expect(byName['8th triplet']).toBeCloseTo(166.667, 3)
    expect(byName['Dotted 16th']).toBe(187.5)
    expect(table).toHaveLength(9)
    expect(table[2].hz).toBe(2)
  })

  it('BPM = 0 is invalid', () => {
    expect(error(bpmToDelay(0))).toMatch(/greater than 0/)
  })

  it('frame sync uses exact NTSC rates', () => {
    const fps = FRAME_RATES.find((f) => f.label === '29.97')!.fps
    const r = value(frameSync(fps))
    expect(r.frameMs).toBeCloseTo(33.3667, 4)
    expect(r.samples.find((s) => s.sampleRate === 48000)!.samples).toBeCloseTo(1601.6, 6)
    expect(value(frameSync(25)).samples[1].samples).toBe(1920)
    expect(frameSync(0).ok).toBe(false)
  })
})

describe('RF', () => {
  it('FSPL at 600 MHz over 100 m ≈ 68.0 dB', () => {
    expect(value(freeSpacePathLoss(600, 100))).toBeCloseTo(68.006, 2)
    expect(freeSpacePathLoss(0, 100).ok).toBe(false)
  })

  const base: LinkBudgetInput = {
    txPowerDbm: 13,
    txGainDbi: 0,
    txCableLossDb: 0,
    pathLossMode: 'auto',
    frequencyMHz: 600,
    distanceM: 100,
    rxGainDbi: 6,
    rxCableLossDb: 2,
    multicouplerLossDb: 3,
    rxSensitivityDbm: -95,
  }

  it('computes received level and margin', () => {
    const r = value(linkBudget(base))
    expect(r.receivedDbm).toBeCloseTo(13 - r.pathLossDb + 6 - 2 - 3, 10)
    expect(r.marginDb).toBeCloseTo(r.receivedDbm + 95, 10)
    expect(r.status).toBe('Excellent')
  })

  it('supports manual path loss', () => {
    const r = value(linkBudget({ ...base, pathLossMode: 'manual', manualPathLossDb: 114 }))
    expect(r.marginDb).toBeCloseTo(-5, 10)
    expect(r.status).toBe('No link')
    expect(linkBudget({ ...base, pathLossMode: 'manual', manualPathLossDb: null }).ok).toBe(false)
    expect(linkBudget({ ...base, pathLossMode: 'manual', manualPathLossDb: -1 }).ok).toBe(false)
    expect(linkBudget({ ...base, distanceM: 0 }).ok).toBe(false)
    expect(linkBudget({ ...base, txCableLossDb: -1 }).ok).toBe(false)
  })

  it.each([
    [25, 'Excellent'],
    [20, 'Good'],
    [10, 'Good'],
    [5, 'Marginal'],
    [-1, 'No link'],
  ])('margin %s dB → %s', (m, status) => expect(linkStatus(m)).toBe(status))

  it('flags IM3 products within ±200 kHz', () => {
    const r = value(thirdOrderIntermod([500, 501, 502.1]))
    // 2·501 − 500 = 502 → within 200 kHz of 502.1
    const hit = r.find(
      (p) => p.pair[0] === 500 && p.pair[1] === 501 && Math.abs(p.product - 502) < 1e-9,
    )!
    expect(hit.conflict).toBe(true)
    expect(hit.conflictsWith).toBe(502.1)
    expect(r).toHaveLength(6)
  })

  it('reports clean sets and validates', () => {
    expect(value(thirdOrderIntermod([500, 503.3, 510.7])).every((p) => !p.conflict)).toBe(true)
    expect(thirdOrderIntermod([500]).ok).toBe(false)
    expect(thirdOrderIntermod([500, -1]).ok).toBe(false)
    expect(thirdOrderIntermod(Array.from({ length: 9 }, (_, i) => 500 + i)).ok).toBe(false)
    const dup = thirdOrderIntermod([500, 500, null])
    expect(dup.ok && dup.warnings[0]).toMatch(/Duplicate/)
  })
})

describe('power', () => {
  it('amp power ↔ SPL', () => {
    expect(value(ampPowerToSpl(100, 97, 1))).toBeCloseTo(117, 10)
    expect(value(ampPowerToSpl(1000, 100, 10))).toBeCloseTo(110, 10)
    expect(value(splToAmpPower(110, 100, 10))).toBeCloseTo(1000, 6)
    expect(ampPowerToSpl(0, 97, 1).ok).toBe(false)
    expect(splToAmpPower(110, 100, 0).ok).toBe(false)
    expect(splToAmpPower(1e6, 0, 1).ok).toBe(false)
  })

  it('circuit load with the 80% rule', () => {
    const r = value(circuitLoad([3000, 2000, 2000], 230, 16))
    expect(r.totalAmps).toBeCloseTo(7000 / 230, 10)
    expect(r.usableAmpsPerCircuit).toBeCloseTo(12.8, 10)
    expect(r.circuitsRequired).toBe(3)
    expect(r.recommendation).toMatch(/3 × 16 A/)
    const tight = value(circuitLoad([2944], 230, 16))
    expect(tight.circuitsRequired).toBe(1)
    expect(tight.recommendation).toMatch(/Provide 2 circuits/)
    expect(value(circuitLoad([], 120, 20)).circuitsRequired).toBe(0)
    expect(circuitLoad([-5], 230, 16).ok).toBe(false)
    expect(circuitLoad([100], 0, 16).ok).toBe(false)
  })

  it('70/100 V line', () => {
    const r = value(constantVoltageLine([10, 10, 5, null], 70))
    expect(r.totalWatts).toBe(25)
    expect(r.impedance).toBeCloseTo(196, 10)
    expect(r.ampWatts).toBe(31.25)
    expect(r.speakers).toBe(3)
    expect(value(constantVoltageLine([50], 100)).impedance).toBe(200)
    expect(constantVoltageLine([], 70).ok).toBe(false)
    expect(constantVoltageLine([0], 70).ok).toBe(false)
  })

  it('impedance wiring modes', () => {
    expect(value(totalImpedance([8, 8], 'parallel')).total).toBeCloseTo(4, 10)
    expect(value(totalImpedance([8, 8], 'series')).total).toBe(16)
    expect(value(totalImpedance([8, 8, 8, 8], 'series-parallel', 2)).total).toBeCloseTo(8, 10)
    const compat = value(totalImpedance([8, 8, 8], 'parallel')).compatibility
    expect(compat).toEqual([
      { ratedMinimum: 4, compatible: false },
      { ratedMinimum: 8, compatible: false },
      { ratedMinimum: 16, compatible: false },
    ])
    expect(value(totalImpedance([8], 'parallel')).compatibility.map((c) => c.compatible)).toEqual([
      true,
      true,
      false,
    ])
    expect(totalImpedance([8, 8, 8], 'series-parallel', 2).ok).toBe(false)
    expect(totalImpedance([8, 8], 'series-parallel', 0).ok).toBe(false)
    expect(totalImpedance([], 'series').ok).toBe(false)
    expect(totalImpedance([0], 'series').ok).toBe(false)
  })
})

describe('show tools', () => {
  const row = (source: string, extra: Partial<InputChannel> = {}): InputChannel => ({
    id: source,
    channel: 0,
    source,
    type: 'mic',
    micType: 'SM57',
    stand: 'Short',
    phantom: false,
    notes: '',
    ...extra,
  })

  it('exports CSV with escaping and renumbering', () => {
    const csv = inputListToCsv([
      row('Kick In'),
      row('Vox, "lead"', { type: 'line', phantom: true, notes: 'a\nb' }),
    ])
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('Channel,Source,Mic/Line,Mic type,Stand,48V,Notes')
    expect(lines[1]).toBe('1,Kick In,Mic,SM57,Short,No,')
    expect(csv).toContain('2,"Vox, ""lead""",Line,SM57,Short,Yes,"a\nb"')
  })

  it('moves items', () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1])
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2])
    const same = [1, 2]
    expect(moveItem(same, 0, 5)).toBe(same)
  })

  it('rigging load per point', () => {
    const r = riggingLoad({
      weightKg: 1200,
      points: 2,
      bridleAngleDeg: 0,
      safetyFactor: 10,
      hoistCapacityKg: 1000,
    })
    expect(value(r).loadPerPoint).toBe(600)
    expect(value(r).requiredStrength).toBe(6000)
    expect(value(r).exceedsHoist).toBe(false)
    const angled = riggingLoad({
      weightKg: 1200,
      points: 2,
      bridleAngleDeg: 60,
      safetyFactor: 7,
      hoistCapacityKg: 1000,
    })
    expect(value(angled).loadPerPoint).toBeCloseTo(1200, 6)
    expect(value(angled).exceedsHoist).toBe(true)
    expect(angled.ok && angled.warnings[0]).toMatch(/exceeds/)
    const steep = riggingLoad({
      weightKg: 100,
      points: 1,
      bridleAngleDeg: 70,
      safetyFactor: 10,
      hoistCapacityKg: 500,
    })
    expect(steep.ok && steep.warnings[0]).toMatch(/60°/)
    expect(
      riggingLoad({
        weightKg: 100,
        points: 1,
        bridleAngleDeg: 90,
        safetyFactor: 10,
        hoistCapacityKg: 500,
      }).ok,
    ).toBe(false)
    expect(
      riggingLoad({
        weightKg: 100,
        points: 1.5,
        bridleAngleDeg: 0,
        safetyFactor: 10,
        hoistCapacityKg: 500,
      }).ok,
    ).toBe(false)
    expect(
      riggingLoad({
        weightKg: 100,
        points: 0,
        bridleAngleDeg: 0,
        safetyFactor: 10,
        hoistCapacityKg: 500,
      }).ok,
    ).toBe(false)
  })
})
