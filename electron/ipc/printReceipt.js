/**
 * ESC/POS thermal printing via node-thermal-printer.
 * Set MWALIMU_THERMAL_INTERFACE e.g. printer:EPSON_TM_T20 or tcp://192.168.1.100:9100
 * If unset or execute fails, callers should use HTML simulation in the renderer.
 */

const { printer: ThermalPrinter, types: PrinterTypes, characterSet: CharacterSet, breakLine: BreakLine } =
  require('node-thermal-printer')

function normalizeItems(items) {
  if (!Array.isArray(items)) return []
  return items.map((i) => ({
    name: i.productName || i.product_name || i.name || 'Item',
    qty: Number(i.qty ?? i.quantity ?? 1),
    unit: Number(i.price ?? i.unit_price ?? 0),
    line: Number(i.total_price ?? (Number(i.price ?? i.unit_price ?? 0) * Number(i.qty ?? i.quantity ?? 1))),
    color: i.color || '',
    size: i.size || '',
  }))
}

/**
 * @param {object} receiptData — same shape as renderer receipt (receipt_no, items, total, customerName, method, …)
 * @returns {Promise<{ printed: boolean, simulated: boolean, error?: string }>}
 */
async function printThermalReceipt(receiptData) {
  const iface = process.env.MWALIMU_THERMAL_INTERFACE || ''
  if (!iface.trim()) {
    return { printed: false, simulated: true, error: 'MWALIMU_THERMAL_INTERFACE not set' }
  }

  let printer
  try {
    printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: iface,
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: true,
      lineCharacter: '-',
      breakLine: BreakLine.WORD,
      width: 42,
    })
  } catch (e) {
    return { printed: false, simulated: true, error: e.message }
  }

  const receiptNo = receiptData.receipt_no || receiptData.receiptNo || '—'
  const total = Number(receiptData.total ?? 0)
  const customer = receiptData.customerName || receiptData.client_name || 'Walk-in'
  const method = receiptData.method || receiptData.payment_method || 'cash'
  const items = normalizeItems(receiptData.items)

  printer.alignCenter()
  printer.bold(true)
  printer.println('MWALIMU UNIFORMS')
  printer.bold(false)
  printer.println('Quality School Uniforms')
  printer.println('Tel: +254 700 000 000')
  printer.drawLine()
  printer.alignLeft()
  printer.println(`Receipt: ${receiptNo}`)
  printer.println(`Customer: ${customer}`)
  printer.println(`Payment: ${method}`)
  printer.drawLine()

  for (const line of items) {
    const title = String(line.name).slice(0, 28)
    printer.println(`${title}`)
    const detail = [line.color && `Clr:${line.color}`, line.size && `Sz:${line.size}`].filter(Boolean).join(' ')
    if (detail) printer.println(detail)
    printer.leftRight(`${line.qty} x ${String(line.unit)}`, String(line.line))
  }

  printer.drawLine()
  printer.bold(true)
  printer.leftRight('TOTAL KES', `${total}`)
  printer.bold(false)
  printer.newLine()
  printer.alignCenter()
  printer.println('Thank you!')
  printer.partialCut()

  try {
    await printer.execute()
    return { printed: true, simulated: false }
  } catch (err) {
    console.error('Thermal print failed:', err.message)
    return { printed: false, simulated: true, error: err.message }
  }
}

module.exports = { printThermalReceipt }
