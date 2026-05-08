const fs = require('fs');
const Database = require('better-sqlite3');

const db = new Database('dev-data.db');

console.log('Starting import...');

// 1. Ensure the parent "Schools" category exists
const schoolsCat = db.prepare("SELECT id FROM categories WHERE id = 'schools'").get();
if (!schoolsCat) {
  console.error("Error: 'schools' parent category not found in DB.");
  process.exit(1);
}

// 2. Ensure all specific schools exist in the categories table
const schoolsToInsert = [
  { id: 'school_lca', name: 'Londiani Christian Academy' },
  { id: 'school_lgc', name: 'Londiani Girls' },
  { id: 'school_baraka', name: 'Baraka Senior' },
  { id: 'school_sacred', name: 'Sacred Hills' },
  { id: 'school_township', name: 'Township Senior' },
  { id: 'school_kimasian', name: 'Kimasian Senior' },
  { id: 'school_lelu', name: 'Lelu' }
];

const insertCat = db.prepare(`
  INSERT OR IGNORE INTO categories (id, name, parent_id, icon, sort_order) 
  VALUES (?, ?, 'schools', '🏫', 0)
`);

db.transaction(() => {
  for (const school of schoolsToInsert) {
    insertCat.run(school.id, school.name);
  }
})();
console.log('✅ School categories verified/created.');

// Helper to convert empty CSV cells to NULL
const parseNull = (val) => (val === undefined || val === null || val.trim() === '') ? null : val.trim();

// 3. Import Products
console.log('Importing Products...');
const productsFile = fs.readFileSync('pullovers_products.csv', 'utf8').split('\n');
const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products 
  (id, name, category_id, subcategory, school_id, icon, cost_price, price, barcode, description, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

db.transaction(() => {
  for (let i = 1; i < productsFile.length; i++) { // Skip header
    if (!productsFile[i].trim()) continue;
    const cols = productsFile[i].split(',');
    insertProduct.run(
      parseNull(cols[0]), // id
      parseNull(cols[1]), // name
      parseNull(cols[2]), // category_id
      parseNull(cols[3]), // subcategory
      parseNull(cols[4]), // school_id
      parseNull(cols[5]), // icon
      Number(parseNull(cols[6]) || 0), // cost_price
      Number(parseNull(cols[7]) || 0), // price
      parseNull(cols[8]), // barcode
      parseNull(cols[9]), // description
      Number(parseNull(cols[10]) || 1), // is_active
      parseNull(cols[11]), // created_at
      parseNull(cols[12])  // updated_at
    );
  }
})();
console.log('✅ Products imported.');

// 4. Import Variants
console.log('Importing Variants...');
const variantsFile = fs.readFileSync('pullovers_variants.csv', 'utf8').split('\n');
const insertVariant = db.prepare(`
  INSERT OR REPLACE INTO product_variants 
  (id, product_id, color, color_hex, size, sku, stock_qty, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

db.transaction(() => {
  for (let i = 1; i < variantsFile.length; i++) { // Skip header
    if (!variantsFile[i].trim()) continue;
    const cols = variantsFile[i].split(',');
    insertVariant.run(
      parseNull(cols[0]), // id
      parseNull(cols[1]), // product_id
      parseNull(cols[2]), // color
      parseNull(cols[3]), // color_hex
      parseNull(cols[4]), // size
      parseNull(cols[5]), // sku
      Number(parseNull(cols[6]) || 0), // stock_qty
      parseNull(cols[7])  // created_at
    );
  }
})();
console.log('✅ Product Variants imported.');
console.log('🎉 Full import completed successfully!');
