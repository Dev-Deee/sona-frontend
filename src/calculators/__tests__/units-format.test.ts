import { describe, expect, it } from 'vitest'
import {
  cToF,
  fToC,
  fromDisplay,
  ftToM,
  kgToLb,
  lbToKg,
  mToFt,
  toDisplay,
  unitLabel,
  type QuantityKind,
} from '../units'
import {
  fmtDb,
  fmtDbSigned,
  fmtDistance,
  fmtHz,
  fmtMs,
  formatInputValue,
  formatNumber,
  INVALID,
} from '../format'
import { firstError, isNum, requireNonNegative, requireNumber, requirePositive } from '../types'

describe('units', () => {
  it('converts temperature both ways', () => {
    expect(cToF(0)).toBe(32)
    expect(cToF(100)).toBe(212)
    expect(fToC(-40)).toBe(-40)
    expect(fToC(cToF(21.6))).toBeCloseTo(21.6, 10)
  })

  it('converts distance and weight with round-trip accuracy', () => {
    expect(mToFt(1)).toBeCloseTo(3.28084, 5)
    expect(ftToM(mToFt(123.456))).toBeCloseTo(123.456, 10)
    expect(kgToLb(1)).toBeCloseTo(2.20462, 5)
    expect(lbToKg(kgToLb(750))).toBeCloseTo(750, 10)
  })

  const kinds: QuantityKind[] = ['distance', 'temperature', 'volume', 'area', 'weight', 'speed']

  it.each(kinds)('round-trips %s through display units', (kind) => {
    for (const si of [-12.5, 0, 1, 343.2, 9999]) {
      expect(fromDisplay(kind, toDisplay(kind, si, 'imperial'), 'imperial')).toBeCloseTo(si, 9)
      expect(toDisplay(kind, si, 'metric')).toBe(si)
      expect(fromDisplay(kind, si, 'metric')).toBe(si)
    }
  })

  it('scales volume and area by the cube and square of feet', () => {
    expect(toDisplay('volume', 1, 'imperial')).toBeCloseTo(35.3147, 3)
    expect(toDisplay('area', 1, 'imperial')).toBeCloseTo(10.7639, 3)
  })

  it('labels units per system', () => {
    expect(unitLabel('distance', 'metric')).toBe('m')
    expect(unitLabel('distance', 'imperial')).toBe('ft')
    expect(unitLabel('temperature', 'imperial')).toBe('°F')
    expect(unitLabel('weight', 'imperial')).toBe('lb')
  })
})

describe('format', () => {
  it('never renders NaN, Infinity or undefined', () => {
    for (const bad of [NaN, Infinity, -Infinity, undefined, null]) {
      expect(formatNumber(bad as number, 2)).toBe(INVALID)
      expect(fmtDistance(bad as number)).toBe(INVALID)
    }
  })

  it('applies the precision rules', () => {
    expect(fmtDistance(4.30600000000001)).toBe('4.306')
    expect(fmtDb(-6.0206)).toBe('-6.02')
    expect(fmtHz(85.7)).toBe('86')
    expect(fmtMs(1.23456)).toBe('1.235')
    expect(formatNumber(12345.678, 1)).toBe('12,345.7')
  })

  it('does not show negative zero', () => {
    expect(formatNumber(-0.0001, 2)).toBe('0.00')
    expect(formatNumber(-0, 0)).toBe('0')
  })

  it('signs dB values', () => {
    expect(fmtDbSigned(3.0103)).toBe('+3.01')
    expect(fmtDbSigned(-6)).toBe('-6.00')
    expect(fmtDbSigned(0)).toBe('0.00')
    expect(fmtDbSigned(NaN)).toBe(INVALID)
  })

  it('formats editable input values compactly', () => {
    expect(formatInputValue(32.80839895013123)).toBe('32.808')
    expect(formatInputValue(10)).toBe('10')
    expect(formatInputValue(-0.0001)).toBe('0')
    expect(formatInputValue(null)).toBe('')
    expect(formatInputValue(NaN)).toBe('')
  })
})

describe('validation helpers', () => {
  it('validate presence and sign', () => {
    expect(isNum(1)).toBe(true)
    expect(isNum(NaN)).toBe(false)
    expect(isNum('1')).toBe(false)
    expect(requirePositive(0, 'x')).toMatch(/greater than 0/)
    expect(requirePositive(null, 'x')).toMatch(/Enter a value/)
    expect(requirePositive(2, 'x')).toBeNull()
    expect(requireNonNegative(-1, 'x')).toMatch(/negative/)
    expect(requireNonNegative(0, 'x')).toBeNull()
    expect(requireNonNegative(undefined, 'x')).toMatch(/Enter/)
    expect(requireNumber(undefined, 'x')).toMatch(/Enter/)
    expect(firstError(null, 'a', 'b')).toBe('a')
    expect(firstError(null, null)).toBeNull()
  })
})
