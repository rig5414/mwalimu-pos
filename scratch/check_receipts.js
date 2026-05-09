const Database = require('better-sqlite3')
const path = require('path')
const db = new Database('dev-data.db')

try {
  const rows = db.prepare('SELECT receipt_no, created_at FROM sales ORDER BY receipt_no DESC LIMIT 10').all()
  console.log('Recent Receipts (ordered by receipt_no):', rows)
  
  const lastByDate = db.prepare('SELECT receipt_no, created_at FROM sales ORDER BY created_at DESC LIMIT 1').get()
  console.log('Last by Date:', lastByDate)
} catch (e) {
  console.error(e)
}
