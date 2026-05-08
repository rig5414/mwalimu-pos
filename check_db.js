const Database = require('better-sqlite3');
const db = new Database('dev-data.db');
console.log('Products:', db.prepare('SELECT COUNT(*) as c FROM products').get().c);
console.log('Variants:', db.prepare('SELECT COUNT(*) as c FROM product_variants').get().c);
