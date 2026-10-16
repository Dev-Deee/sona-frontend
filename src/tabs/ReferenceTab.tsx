import type { ReactNode } from 'react'
import { speedOfSound } from '../calculators/acoustics'
import { formatNumber } from '../calculators/format'
import { awgToMm2 } from '../calculators/gainSignal'

function Section({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children: ReactNode
}) {
  const id = `ref-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <header className="border-b border-divider px-5 py-6 md:px-8">
        <h2
          id={id}
          className="font-serif text-2xl font-semibold tracking-tight text-fg md:text-[28px]"
        >
          {title}
        </h2>
        <p className="mt-2 max-w-3xl font-serif text-[15px] leading-relaxed text-fg-2">{intro}</p>
      </header>
      <div className="px-5 py-6 md:px-8">{children}</div>
    </section>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-divider">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-input text-xs text-fg-2">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-divider">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-2 ${j === 0 ? 'text-fg-2' : 'font-num font-medium text-const-fg'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FORMULAS: { category: string; items: [string, string][] }[] = [
  {
    category: 'Acoustics',
    items: [
      ['Speed of sound', 'c = 331.3 × √(1 + T/273.15) m/s'],
      ['Wavelength', 'λ = c / f'],
      ['Period', 'T = 1000 / f ms'],
      ['RT60 (Sabine)', '0.161 × V / A'],
      ['RT60 (Eyring)', '0.161 × V / (−S × ln(1 − ā))'],
      ['Critical distance', 'Dc = 0.057 × √(V / RT60)'],
      ['Axial room mode', 'f = (c / 2) × (p / L)'],
      ['ITDG', 'distance / c × 1000 ms'],
    ],
  },
  {
    category: 'Coverage & arrays',
    items: [
      ['Inverse square law', 'SPL₂ = SPL₁ − 20·log₁₀(d₂ / d₁)'],
      ['Forward aspect ratio', 'FAR = 1 / sin(θ / 2)'],
      ['Lateral aspect ratio', 'LAR = 2 × tan(θ / 2)'],
      ['Coverage angle', 'θ = 2 × atan(w / 2d)'],
      ['Comb filter notch', 'f = c / (2Δ)'],
      ['Beaming frequency', 'f = c / box height'],
      ['Max sub spacing', 'c / (2 f)'],
      ['Uncoupled spacing', '2 h × tan(θ / 2)'],
    ],
  },
  {
    category: 'Gain & signal',
    items: [
      ['dB (voltage / SPL)', '20 × log₁₀(ratio)'],
      ['dB (power)', '10 × log₁₀(ratio)'],
      ['Correlated summation', '20 × log₁₀(n)'],
      ['Adding levels', '10 × log₁₀(Σ 10^(Lₙ / 10))'],
      ['Removing background', '10 × log₁₀(10^(L / 10) − 10^(B / 10))'],
      ['Cable resistance', '0.0172 / mm² × 2 × length'],
      ['AWG → mm²', '0.012668 × 92^((36 − AWG) / 19.5)'],
    ],
  },
  {
    category: 'Intelligibility',
    items: [
      ['STI (estimate)', '(SNR / 30 + 1) / (1 + RT60)'],
      ['%ALcons (Peutz)', '0.652 × N × 10^(−D/R / 10) × RT60'],
      ['PAG', '20·log₁₀(D0·D1 / (Ds·D2)) − 10·log₁₀(NOM) − FSM'],
      ['NAG', '20·log₁₀(D0 / EAD)'],
    ],
  },
  {
    category: 'Timing',
    items: [
      ['Phase delay', '(φ / 360) × (1000 / f) ms'],
      ['Distance from delay', '(t / 1000) × c'],
      ['Quarter note', '60000 / BPM ms'],
    ],
  },
  {
    category: 'RF & power',
    items: [
      ['Free space path loss', '20·log₁₀(d) + 20·log₁₀(f) + 20·log₁₀(4π / c)'],
      ['IM3 products', '2f₁ − f₂, 2f₂ − f₁'],
      ['SPL from power', 'sens + 10·log₁₀(P) − 20·log₁₀(d)'],
      ['Current', 'I = P / V'],
      ['Constant-voltage load', 'Z = V² / P'],
      ['Parallel impedance', '1/Z = Σ 1/Zₙ'],
      ['Rigging load', '(W / n) / cos(angle)'],
      ['Allowed noise exposure', 'T_ref ÷ 2^((L − L_ref) ÷ exchange rate)'],
      ['Delay tower setting', 'mains → tower distance ÷ c + Haas offset'],
    ],
  },
]

export function FormulasReference() {
  return (
    <Section title="Formulas" intro="Every formula Sona uses, grouped by discipline.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {FORMULAS.map((group) => (
          <div key={group.category}>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-2">
              {group.category}
            </h3>
            <Table
              headers={['Quantity', 'Formula']}
              rows={group.items.map(([q, f]) => [q, <span className="font-serif">{f}</span>])}
            />
          </div>
        ))}
      </div>
    </Section>
  )
}

export function SpeedOfSoundReference() {
  const speed = (t: number) => {
    const r = speedOfSound(t)
    return r.ok
      ? `${formatNumber(r.value.metersPerSecond, 1)} m/s · ${formatNumber(r.value.feetPerSecond, 0)} ft/s`
      : '—'
  }
  return (
    <Section
      title="Speed of sound"
      intro="Sound speeds up by roughly 0.6 m/s for every degree Celsius."
    >
      <Table
        headers={['Temperature', 'Speed']}
        rows={[-10, 0, 10, 20, 25, 30, 35, 40].map((t) => [`${t} °C`, speed(t)])}
      />
    </Section>
  )
}

export function LevelsReference() {
  return (
    <Section
      title="Reference levels"
      intro="What “zero” means for each decibel scale you’ll meet on a spec sheet."
    >
      <Table
        headers={['Level', 'Equivalent']}
        rows={[
          ['0 dBu', '0.775 V RMS'],
          ['0 dBV', '1.000 V RMS (+2.21 dBu)'],
          ['+4 dBu (pro line level)', '1.228 V RMS'],
          ['−10 dBV (consumer line level)', '0.316 V RMS'],
          ['0 dBFS', 'Digital full scale (commonly aligned to +18 to +24 dBu)'],
          ['0 dB SPL', '20 µPa (threshold of hearing)'],
          ['0 dBm', '1 mW'],
        ]}
      />
    </Section>
  )
}

export function ImpedanceReference() {
  return (
    <Section
      title="Standard impedances"
      intro="Typical source and load impedances across the signal chain."
    >
      <Table
        headers={['Interface', 'Impedance']}
        rows={[
          ['Mic output', '150 – 600 Ω'],
          ['Mic preamp input', '1 – 3 kΩ'],
          ['Line output', '50 – 600 Ω'],
          ['Line input', '10 – 50 kΩ'],
          ['Instrument (Hi-Z) input', '≥ 1 MΩ'],
          ['Loudspeaker (nominal)', '4, 8, 16 Ω'],
          ['AES3 digital', '110 Ω'],
          ['Video / word clock / AES-3id', '75 Ω'],
        ]}
      />
    </Section>
  )
}

export function IntervalsReference() {
  return (
    <Section
      title="Frequency intervals"
      intro="Ratios between frequencies, as used by analysers and graphic EQs."
    >
      <Table
        headers={['Interval', 'Ratio']}
        rows={[
          ['Octave', '2 : 1  (×2.000)'],
          ['Half octave', '√2 : 1  (×1.414)'],
          ['Third octave', '2^(1/3) : 1  (×1.260)'],
          ['Sixth octave', '2^(1/6) : 1  (×1.122)'],
          ['Semitone', '2^(1/12) : 1  (×1.059)'],
        ]}
      />
    </Section>
  )
}

export function SampleRatesReference() {
  return (
    <Section
      title="Sample rates"
      intro="Sample period and Nyquist limit for common digital audio rates."
    >
      <Table
        headers={['Rate', 'Sample period', 'Nyquist']}
        rows={[44100, 48000, 88200, 96000, 176400, 192000].map((fs) => [
          `${formatNumber(fs / 1000, 1)} kHz`,
          `${formatNumber(1e6 / fs, 3)} µs`,
          `${formatNumber(fs / 2000, 2)} kHz`,
        ])}
      />
    </Section>
  )
}

export function CableGaugeReference() {
  return (
    <Section
      title="Cable gauge"
      intro="AWG sizes, their copper cross-section and loop resistance per 100 m of run."
    >
      <Table
        headers={['AWG', 'mm²', 'Ω per 100 m loop']}
        rows={[8, 10, 12, 14, 16, 18].map((awg) => {
          const mm2 = awgToMm2(awg)
          return [`${awg} AWG`, formatNumber(mm2, 2), formatNumber((0.0172 / mm2) * 200, 3)]
        })}
      />
    </Section>
  )
}
