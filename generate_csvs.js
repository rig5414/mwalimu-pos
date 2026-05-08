const fs = require('fs');

const products = [
  { id: 'prod_plain_pull', name: 'Plain Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: '', icon: '🧥', cost_price: 800, price: 1200 },
  { id: 'prod_striped_pull', name: 'Striped Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: '', icon: '🧥', cost_price: 850, price: 1300 },
  { id: 'prod_lca_pull', name: 'LCA Badged Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: 'school_lca', icon: '🧥', cost_price: 900, price: 1500 },
  { id: 'prod_lgc_pull', name: 'LGC Badged Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: 'school_lgc', icon: '🧥', cost_price: 900, price: 1500 },
  { id: 'prod_baraka_pull', name: 'Baraka Senior Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: 'school_baraka', icon: '🧥', cost_price: 900, price: 1500 },
  { id: 'prod_sacred_pull', name: 'Sacred Hills Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: 'school_sacred', icon: '🧥', cost_price: 900, price: 1500 },
  { id: 'prod_township_pull', name: 'Township Senior Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: 'school_township', icon: '🧥', cost_price: 900, price: 1500 },
  { id: 'prod_kimasian_pull', name: 'Kimasian Senior Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: 'school_kimasian', icon: '🧥', cost_price: 900, price: 1500 },
  { id: 'prod_lelu_pull', name: 'Lelu Pullover', category_id: 'school-uniforms', subcategory: 'Pullovers', school_id: 'school_lelu', icon: '🧥', cost_price: 900, price: 1500 },
];

let productsCSV = 'id,name,category_id,subcategory,school_id,icon,cost_price,price,barcode,description,is_active,created_at,updated_at\n';
products.forEach(p => {
  productsCSV += `${p.id},${p.name},${p.category_id},${p.subcategory},${p.school_id},${p.icon},${p.cost_price},${p.price},,,1,2026-05-08 12:00:00,2026-05-08 12:00:00\n`;
});
fs.writeFileSync('pullovers_products.csv', productsCSV);

const variants = [];
let vCount = 1;

// 1. Plain
const plainColors = ['Maroon', 'Green', 'Grey', 'Royal Blue', 'Red', 'Navy Blue', 'Jungle Green', 'Beige', 'Dark Brown'];
plainColors.forEach(color => {
  for (let s = 24; s <= 40; s++) {
    variants.push({ id: `v_${vCount++}`, product_id: 'prod_plain_pull', color, color_hex: '', size: s, sku: `PLAIN-${color.substring(0,3).toUpperCase()}-${s}`, stock_qty: 0 });
  }
});

// 2. Striped
const stripedColors = ['Navy White', 'Grey White', 'Green White', 'Royal White', 'Red White', 'Beige Brown', 'Maroon White'];
stripedColors.forEach(color => {
  for (let s = 24; s <= 40; s++) {
    variants.push({ id: `v_${vCount++}`, product_id: 'prod_striped_pull', color, color_hex: '', size: s, sku: `STRIPE-${color.replace(' ','').substring(0,4).toUpperCase()}-${s}`, stock_qty: 0 });
  }
});

// 3. Badged LCA
[24,26,28,30,32,34].forEach(s => variants.push({ id: `v_${vCount++}`, product_id: 'prod_lca_pull', color: 'Maroon', color_hex: '', size: s, sku: `LCA-MAR-${s}`, stock_qty: 0 }));
[32,34,36].forEach(s => variants.push({ id: `v_${vCount++}`, product_id: 'prod_lca_pull', color: 'Grey', color_hex: '', size: s, sku: `LCA-GRY-${s}`, stock_qty: 0 }));

// 4. Badged LGC
[24,26,28,30,32,34].forEach(s => variants.push({ id: `v_${vCount++}`, product_id: 'prod_lgc_pull', color: 'Red', color_hex: '', size: s, sku: `LGC-RED-${s}`, stock_qty: 0 }));
[32,34,36,38].forEach(s => variants.push({ id: `v_${vCount++}`, product_id: 'prod_lgc_pull', color: 'Maroon', color_hex: '', size: s, sku: `LGC-MAR-${s}`, stock_qty: 0 }));

// 5-9. Other Schools
const schoolMap = [
  { id: 'prod_baraka_pull', skuPrefix: 'BAR' },
  { id: 'prod_sacred_pull', skuPrefix: 'SAC' },
  { id: 'prod_township_pull', skuPrefix: 'TWN' },
  { id: 'prod_kimasian_pull', skuPrefix: 'KIM' },
  { id: 'prod_lelu_pull', skuPrefix: 'LEL' },
];
schoolMap.forEach(school => {
  [32,34,36,38,40].forEach(s => {
    variants.push({ id: `v_${vCount++}`, product_id: school.id, color: 'Standard', color_hex: '', size: s, sku: `${school.skuPrefix}-STD-${s}`, stock_qty: 0 });
  });
});

let variantsCSV = 'id,product_id,color,color_hex,size,sku,stock_qty,created_at\n';
variants.forEach(v => {
  variantsCSV += `${v.id},${v.product_id},${v.color},${v.color_hex},${v.size},${v.sku},${v.stock_qty},2026-05-08 12:00:00\n`;
});
fs.writeFileSync('pullovers_variants.csv', variantsCSV);

console.log(`Generated pullovers_products.csv (${products.length} rows)`);
console.log(`Generated pullovers_variants.csv (${variants.length} rows)`);
