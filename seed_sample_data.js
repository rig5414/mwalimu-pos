const Database = require('better-sqlite3')
const path = require('path')
const { v4: uuidv4 } = require('uuid')

// We must run this using npx electron to avoid sqlite binary mismatch
const dbPath = path.join(__dirname, 'dev-data.db')
const db = new Database(dbPath)

const categories = ['Games Attires', 'Footwear', 'Innerwear', 'Beddings']

console.log('Checking categories...')
categories.forEach(cat => {
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(cat)
  if (!existing) {
    db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)').run(uuidv4(), cat)
  }
})

const getCatId = (name) => db.prepare('SELECT id FROM categories WHERE name = ?').get(name).id

const samples = [
  // Footwear
  { category: 'Footwear', subcategory: 'Toughees', name: 'Boys Toughees Lace Up', variants: ['Size 37', 'Size 38', 'Size 39', 'Size 40'] },
  { category: 'Footwear', subcategory: 'Studeez', name: 'Girls Studeez Buckle', variants: ['Size 36', 'Size 37', 'Size 38'] },
  { category: 'Footwear', subcategory: 'Rubber Shoes', name: 'White Rubber Shoes', variants: ['Size 39', 'Size 40'] },
  { category: 'Footwear', subcategory: 'Crocs', name: 'Black Crocs', variants: ['Size 40', 'Size 41'] },
  
  // Games Attires
  { category: 'Games Attires', subcategory: 'Tracksuits', name: 'Plain Tracksuit', variants: ['Small', 'Medium', 'Large'] },
  { category: 'Games Attires', subcategory: 'Tracksuits', name: 'Striped Tracksuit', variants: ['Small', 'Medium', 'Large'] },
  { category: 'Games Attires', subcategory: 'T-Shirts', name: 'House T-Shirt (Red)', variants: ['Small', 'Medium', 'Large'] },
  { category: 'Games Attires', subcategory: 'T-Shirts', name: 'House T-Shirt (Blue)', variants: ['Small', 'Medium'] },
  { category: 'Games Attires', subcategory: 'Jersey', name: 'School Jersey', variants: ['Small', 'Medium', 'Large'] },
  
  // Beddings
  { category: 'Beddings', subcategory: 'Blankets', name: 'Heavy Duty Blanket', variants: ['Single', 'Double'] },
  { category: 'Beddings', subcategory: 'Bedsheets', name: 'Cotton Bedsheet (Blue)', variants: ['Single'] },
  { category: 'Beddings', subcategory: 'Towels', name: 'Bath Towel', variants: ['Medium', 'Large'] },
  
  // Innerwear
  { category: 'Innerwear', subcategory: 'Boxers', name: 'Cotton Boxers 3-Pack', variants: ['Small', 'Medium', 'Large'] },
  { category: 'Innerwear', subcategory: 'Vests', name: 'White Vest', variants: ['Small', 'Medium'] },
  { category: 'Innerwear', subcategory: 'Panties', name: 'Girls Panties 5-Pack', variants: ['Small', 'Medium'] }
]

const insertProduct = db.prepare('INSERT INTO products (id, name, category_id, subcategory, cost_price, price, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)')
const insertVariant = db.prepare('INSERT INTO product_variants (id, product_id, size, stock_qty) VALUES (?, ?, ?, ?)')

console.log('Seeding products and variants...')
db.transaction(() => {
  for (const s of samples) {
    const catId = getCatId(s.category)
    const productId = uuidv4()
    insertProduct.run(productId, s.name, catId, s.subcategory, 500, 800)
    
    for (const v of s.variants) {
      insertVariant.run(uuidv4(), productId, v, Math.floor(Math.random() * 50) + 10) // 10-60 stock
    }
  }
})()

console.log('Done! Added sample data for Games Attires, Footwear, Beddings, and Innerwear.')
