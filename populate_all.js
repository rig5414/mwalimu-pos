const Database = require('better-sqlite3');
const db = new Database('dev-data.db');

console.log('Generating additional products and variants...');

const newProducts = [];
const newVariants = [];
let vId = Date.now();
const randStock = () => Math.floor(Math.random() * 41) + 10; // 10 to 50

// 1. Trousers
newProducts.push({ id: 'prod_trousers', name: 'Trousers', category_id: 'school-uniforms', subcategory: 'Trousers', price: 1000, icon: '👖' });
['Black', 'Dark Grey', 'Navy Blue', 'Light Grey', 'Maroon'].forEach(color => {
  for(let s=23; s<=34; s++) newVariants.push({ id: `v_${vId++}`, product_id: 'prod_trousers', color, size: s, stock_qty: randStock() });
});

// 2. Half Sweaters / Windbreakers
newProducts.push({ id: 'prod_half_sweater', name: 'Half Sweater / Windbreaker', category_id: 'school-uniforms', subcategory: 'Half Sweaters', price: 900, icon: '🧥' });
['Navy Blue', 'Maroon', 'Black'].forEach(color => {
  [30,32,34,36,38,40].forEach(s => newVariants.push({ id: `v_${vId++}`, product_id: 'prod_half_sweater', color, size: s, stock_qty: randStock() }));
});

// 3. Socks
const sockColors = ['GBW (Gray Blue White)', 'GGW (Grey Green White)', 'GMW (Grey Maroon White)', 'GRW (Grey Red White)', 'GNW (Grey Navy Blue White)', 'White Green', 'Grey Maroon', 'White Navy Blue', 'Grey Plain', 'Grey Maroon Yellow', 'Beige Brown', 'Grey Red', 'White Maroon', 'Black', 'Yellow', 'Red', 'White'];
[
  { id: 'prod_socks_patmart', name: 'Socks (Patmart / Best Quality)' },
  { id: 'prod_socks_scholar', name: 'Socks (Scholar / Medium Quality)' },
  { id: 'prod_socks_50bob', name: 'Socks (50 Bob / Low Quality)' }
].forEach(prod => {
  newProducts.push({ ...prod, category_id: 'school-uniforms', subcategory: 'Socks', price: 150, icon: '🧦' });
  sockColors.forEach(color => newVariants.push({ id: `v_${vId++}`, product_id: prod.id, color, size: 'One Size', stock_qty: randStock() }));
});

// 4. Tie
const tieColors = ['Black', 'Red', 'Navy Blue', 'Royal Blue', 'Green', 'Dark Green', 'Maroon', 'Grey', 'Ash Grey', 'Maroon White', 'Blue White', 'Maroon Yellow', 'Green White', 'Red White', 'Black White', 'Grey White', 'Navy Blue White'];
[
  { id: 'prod_tie_elastic', name: 'Tie (Elastic)' },
  { id: 'prod_tie_long', name: 'Tie (Long)' }
].forEach(prod => {
  newProducts.push({ ...prod, category_id: 'school-uniforms', subcategory: 'Tie', price: 200, icon: '👔' });
  tieColors.forEach(color => newVariants.push({ id: `v_${vId++}`, product_id: prod.id, color, size: 'Standard', stock_qty: randStock() }));
});

// 5. Marvins
const marvinColors = ['Maroon', 'Navy Blue', 'Dark Green', 'Sky Blue', 'Red', 'Royal Blue', 'Black', 'Jungle Green', 'Ash Grey', 'School Grey'];
[
  { id: 'prod_marvin_best', name: 'Marvin (Best Quality)' },
  { id: 'prod_marvin_normal', name: 'Marvin (Normal Quality)' }
].forEach(prod => {
  newProducts.push({ ...prod, category_id: 'school-uniforms', subcategory: 'Marvins', price: 250, icon: '🧢' });
  marvinColors.forEach(color => newVariants.push({ id: `v_${vId++}`, product_id: prod.id, color, size: 'One Size', stock_qty: randStock() }));
});

// 6. Gloves
newProducts.push({ id: 'prod_gloves', name: 'Gloves', category_id: 'school-uniforms', subcategory: 'Gloves', price: 150, icon: '🧤' });
['Red', 'Black', 'Navy Blue', 'Maroon'].forEach(color => {
  newVariants.push({ id: `v_${vId++}`, product_id: 'prod_gloves', color, size: 'One Size', stock_qty: randStock() });
});

// 7. Shorts
newProducts.push({ id: 'prod_shorts', name: 'Shorts', category_id: 'school-uniforms', subcategory: 'Shorts', price: 500, icon: '🩳' });
['Navy Blue', 'Dark Grey', 'Light Grey', 'Maroon', 'Beige', 'Black', 'Blue', 'Bevel Blue'].forEach(color => {
  for(let s=22; s<=30; s++) newVariants.push({ id: `v_${vId++}`, product_id: 'prod_shorts', color, size: s, stock_qty: randStock() });
});

// Insert Products
const insertProduct = db.prepare(`
  INSERT OR REPLACE INTO products (id, name, category_id, subcategory, price, icon)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const insertVariant = db.prepare(`
  INSERT OR REPLACE INTO product_variants (id, product_id, color, size, stock_qty)
  VALUES (?, ?, ?, ?, ?)
`);

db.transaction(() => {
  for (const p of newProducts) insertProduct.run(p.id, p.name, p.category_id, p.subcategory, p.price, p.icon);
  for (const v of newVariants) insertVariant.run(v.id, v.product_id, v.color, String(v.size), v.stock_qty);
  
  // Randomize all existing stock (like pullovers) that is currently 0
  db.prepare(`UPDATE product_variants SET stock_qty = ABS(RANDOM() % 41) + 10 WHERE stock_qty = 0 OR stock_qty IS NULL`).run();
})();

console.log(`✅ Added ${newProducts.length} new products.`);
console.log(`✅ Added ${newVariants.length} new variants.`);
console.log('✅ Randomized stock for all items successfully.');
