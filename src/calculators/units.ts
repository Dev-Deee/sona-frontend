export type UnitSystem = 'metric' | 'imperial'

/** Physical quantity kinds whose display unit depends on the unit system. */
export type QuantityKind = 'distance' | 'temperature' | 'volume' | 'area' | 'weight' | 'speed'

export const M_TO_FT = 3.28084
export const KG_TO_LB = 2.20462262
export const ABSOLUTE_ZERO_C = -273.15

export const cToF = (c: number) => (c * 9) / 5 + 32
export const fToC = (f: number) => ((f - 32) * 5) / 9
export const mToFt = (m: number) => m * M_TO_FT
export const ftToM = (ft: number) => ft / M_TO_FT
export const kgToLb = (kg: number) => kg * KG_TO_LB
export const lbToKg = (lb: number) => lb / KG_TO_LB

const UNIT_LABELS: Record<QuantityKind, Record<UnitSystem, string>> = {
  distance: { metric: 'm', imperial: 'ft' },
  temperature: { metric: '°C', imperial: '°F' },
  volume: { metric: 'm³', imperial: 'ft³' },
  area: { metric: 'm²', imperial: 'ft²' },
  weight: { metric: 'kg', imperial: 'lb' },
  speed: { metric: 'm/s', imperial: 'ft/s' },
}

export const unitLabel = (kind: QuantityKind, system: UnitSystem) => UNIT_LABELS[kind][system]

/** Converts an SI value (m, °C, m³, m², kg, m/s) into the display unit of `system`. */
export function toDisplay(kind: QuantityKind, si: number, system: UnitSystem): number {
  if (system === 'metric') return si
  switch (kind) {
    case 'distance':
    case 'speed':
      return mToFt(si)
    case 'temperature':
      return cToF(si)
    case 'volume':
      return si * M_TO_FT ** 3
    case 'area':
      return si * M_TO_FT ** 2
    case 'weight':
      return kgToLb(si)
  }
}

/** Converts a value entered in the display unit of `system` back into SI. */
export function fromDisplay(kind: QuantityKind, value: number, system: UnitSystem): number {
  if (system === 'metric') return value
  switch (kind) {
    case 'distance':
    case 'speed':
      return ftToM(value)
    case 'temperature':
      return fToC(value)
    case 'volume':
      return value / M_TO_FT ** 3
    case 'area':
      return value / M_TO_FT ** 2
    case 'weight':
      return lbToKg(value)
  }
}
