const Database = require('better-sqlite3')
const db = new Database('dev-data.db')

try {
  const version = db.prepare('PRAGMA user_version').get().user_version
  console.log('Current DB user_version:', version)
  
  const columns = db.prepare('PRAGMA table_info(categories)').all()
  console.log('Categories columns:', columns.map(c => `${c.name} (${c.type})`))
} catch (e) {
  console.error(e)
}
db.close()
