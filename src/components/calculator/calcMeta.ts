import { createContext, useContext } from 'react'

export interface CalcMeta {
  /** Plain-language name. */
  label: string
  /** Technical term. */
  tech: string
  /** The question the calculator answers. */
  question: string
  /** Page it lives on. */
  page: string
}

/** Provided by the tab view so a card can show its registry name, tag and question. */
export const CalcMetaContext = createContext<CalcMeta | null>(null)

export const useCalcMeta = () => useContext(CalcMetaContext)
