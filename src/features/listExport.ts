import { type ListTable, textOn } from '../calculators/patchSheet'
import { downloadBlob } from '../components/calculator/cards/download'

/** File-name-safe slug of the show name. */
export const fileStem = (title: string) =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'sona'

const widths = (t: ListTable) =>
  t.headers.map((h, c) => ({
    width: Math.min(40, Math.max(h.length, ...t.rows.map((r) => r[c]?.length ?? 0)) + 2),
  }))

/** One sheet per table, header row bold and frozen, each row shaded in its channel colour. */
export async function exportXlsx(tables: ListTable[], showTitle: string) {
  if (!tables.length) return
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const sheets = tables.map((t) => ({
    sheet: t.title,
    columns: widths(t),
    stickyRowsCount: 1,
    data: [
      t.headers.map((h) => ({ value: h, fontWeight: 'bold' as const })),
      ...t.rows.map((r, i) => {
        const hex = t.colors[i]
        return r.map((value) =>
          hex ? { value, backgroundColor: hex, textColor: textOn(hex) } : { value },
        )
      }),
    ],
  }))
  const blob = await writeXlsxFile(sheets).toBlob()
  downloadBlob(`${fileStem(showTitle)}-patch.xlsx`, blob)
}

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/** Printable A4 landscape PDF: title, date, then each table with coloured channel numbers. */
export async function exportPdf(tables: ListTable[], showTitle: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  doc.setFontSize(16)
  doc.text(showTitle.trim() || 'Patch sheet', 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(110)
  doc.text(`Made with Sona · ${new Date().toLocaleDateString()}`, 14, 22)
  let y = 28
  for (const t of tables) {
    doc.setFontSize(12)
    doc.setTextColor(20)
    doc.text(t.title, 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [t.headers],
      body: t.rows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.8 },
      headStyles: { fillColor: [20, 20, 20], textColor: 255 },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'center', cellWidth: 16 } },
      didParseCell: (data) => {
        const hex =
          data.section === 'body' && data.column.index === 0 ? t.colors[data.row.index] : null
        if (hex) {
          data.cell.styles.fillColor = rgb(hex)
          data.cell.styles.textColor = rgb(textOn(hex))
        }
      },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }
  downloadBlob(`${fileStem(showTitle)}-patch.pdf`, doc.output('blob'))
}
