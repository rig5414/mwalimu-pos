const Database = require('better-sqlite3')
const db = new Database('dev-data.db')
try {
  const all = db.prepare('SELECT receipt_no FROM sales').all()
  console.log('Total sales:', all.length)
  console.log('All Receipt Numbers:', all.map(r => r.receipt_no).sort())
} catch (e) { console.error(e) }
