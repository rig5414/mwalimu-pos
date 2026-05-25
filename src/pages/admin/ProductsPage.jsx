import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../../hooks/useToast'
import { buildTreeFromFlat, flattenCategoryTree, optionLabel } from '../../lib/categoryTree'

const BLANK_FORM = {
  name: '',
  category_id: '',
  school_id: '',
  cost_price: '',
  price: '',
  barcode: '',
  icon: '📦',
}

const IMPORT_FIELD_OPTIONS = [
  { value: '', label: '— Ignore —' },
  { value: 'name', label: 'Product name' },
  { value: 'price', label: 'Selling price' },
  { value: 'cost_price', label: 'Cost price' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'category', label: 'Category (name)' },
  { value: 'subcategory', label: 'Subcategory' },
  { value: 'color', label: 'Variant color' },
  { value: 'size', label: 'Variant size' },
  { value: 'stock_qty', label: 'Stock qty' },
  { value: 'sku', label: 'SKU' },
  { value: 'description', label: 'Description' },
]

function parseCsvSimple(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return { headers: [], rows: [] }
  const splitLine = (line) => {
    const out = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        q = !q
        continue
      }
      if (ch === ',' && !q) {
        out.push(cur.trim())
        cur = ''
        continue
      }
      cur += ch
    }
    out.push(cur.trim())
    return out
  }
  const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line)
    const row = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').replace(/^"|"$/g, '')
    })
    return row
  })
  return { headers, rows }
}

export default function ProductsPage() {
  const [products, setProducts]         = useState([])
  const [categories, setCategories]     = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [saving, setSaving]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // product to confirm deletion
  const [importOpen, setImportOpen] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRows, setCsvRows] = useState([])
  const [columnMap, setColumnMap] = useState({})
  const [importing, setImporting] = useState(false)
  const [formData, setFormData]         = useState(BLANK_FORM)
  const [variants, setVariants]         = useState([])
  const [newVariant, setNewVariant]     = useState({ color: '', color_hex: '#1a3a5c', size: '', stock_qty: '' })
  const [leafCategories, setLeafCategories] = useState([])
  const toast = useToast()

  const schoolsRoot = useMemo(
    () => categories.find((c) => !c.parent_id && c.name === 'Schools'),
    [categories]
  )
  const schoolBadgeOptions = useMemo(
    () => categories.filter((c) => c.parent_id === schoolsRoot?.id),
    [categories, schoolsRoot]
  )

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])


  async function loadProducts() {
    try {
      if (window.api) {
        const res = await window.api.products.getAll({ include_inactive: true })
        if (!res.ok) throw new Error(res.error)
        setProducts(res.data || [])
      }
    } catch (err) {
      toast.error('Failed to load products: ' + (err.message || 'Unknown error'))
    }
  }

  async function loadCategories() {
    try {
      if (window.api) {
        const [allRes, leavesRes] = await Promise.all([
          window.api.categories.getAll(),
          window.api.categories.getLeaves?.() || window.api.categories.getAll(),
        ])
        if (!allRes.ok) throw new Error(allRes.error)
        if (allRes.data?.length) {
          setCategories(allRes.data)
        }
        if (leavesRes.ok && leavesRes.data?.length) {
          setLeafCategories(leavesRes.data)
          setFormData((prev) => ({
            ...prev,
            category_id: prev.category_id || leavesRes.data[0]?.id || '',
          }))
        } else if (allRes.data?.length) {
          const tree = buildTreeFromFlat(allRes.data)
          const leaves = flattenCategoryTree(tree, { leavesOnly: true })
          setLeafCategories(leaves)
        }
      }
    } catch (_err) {
      toast.error('Failed to load categories')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.category_id || Number(formData.price) <= 0) {
      toast.error('Please fill all required fields with valid values')
      return
    }

    setSaving(true)
    try {
      if (window.api) {
        if (editingId) {
          const res = await window.api.products.update({
            id: editingId,
            name: formData.name.trim(),
            category_id: formData.category_id,
            school_id: formData.school_id || null,
            icon: formData.icon,
            cost_price: Number(formData.cost_price) || 0,
            price: Number(formData.price),
            barcode: formData.barcode.trim() || null,
            is_active: 1,
            variants,
          })
          if (!res.ok) throw new Error(res.error)
          toast.success(`Product "${formData.name}" updated`)
        } else {
          const res = await window.api.products.create({
            name: formData.name.trim(),
            category_id: formData.category_id,
            school_id: formData.school_id || null,
            icon: formData.icon,
            cost_price: Number(formData.cost_price) || 0,
            price: Number(formData.price),
            barcode: formData.barcode.trim() || null,
            variants,
          })
          if (!res.ok) throw new Error(res.error)
          toast.success(`Product "${formData.name}" added`)
        }
        await loadProducts()
      } else {
        // Dev mode local state
        const tempId = editingId || `tmp-${Date.now()}`
        if (editingId) {
          setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...formData, price: Number(formData.price) } : p))
          toast.success(`Product "${formData.name}" updated`)
        } else {
          setProducts(prev => [...prev, { id: tempId, ...formData, price: Number(formData.price), is_active: 1 }])
          toast.success(`Product "${formData.name}" added`)
        }
      }
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  function handleAddVariant() {
    if (!newVariant.color.trim() || !newVariant.size.trim() || Number(newVariant.stock_qty) < 0 || newVariant.stock_qty === '') {
      toast.error('Please fill color and size. Stock qty must be 0 or more.')
      return
    }

    setVariants(prev => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        color: newVariant.color.trim(),
        color_hex: newVariant.color_hex,
        size: newVariant.size.trim(),
        stock_qty: Number(newVariant.stock_qty),
      },
    ])
    setNewVariant({ color: '', color_hex: '#1a3a5c', size: '', stock_qty: '' })
    toast.success('Variant queued for save')
  }

  function removeVariant(variantId) {
    setVariants(prev => prev.filter(v => v.id !== variantId))
  }

  async function toggleActive(product) {
    const nextActive = product.is_active ? 0 : 1
    try {
      if (window.api) {
        const res = await window.api.products.update({
          id: product.id,
          name: product.name,
          category_id: product.category_id,
          subcategory: product.subcategory,
          price: Number(product.price || 0),
          barcode: product.barcode,
          is_active: nextActive,
        })
        if (!res.ok) throw new Error(res.error)
      }
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: nextActive } : p))
      toast.info(`"${product.name}" marked as ${nextActive ? 'active' : 'inactive'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  // Show confirmation dialog before deleting
  function requestDelete(product) {
    setConfirmDelete(product)
  }

  async function confirmDeleteProduct() {
    if (!confirmDelete) return
    const productName = confirmDelete.name
    try {
      if (window.api) {
        const res = await window.api.products.delete(confirmDelete.id)
        if (!res.ok) throw new Error(res.error)
      }
      setProducts(prev => prev.filter(p => p.id !== confirmDelete.id))
      toast.success(`Product "${productName}" deleted`)
    } catch (err) {
      toast.error(err.message || 'Failed to delete product')
    } finally {
      setConfirmDelete(null)
    }
  }

  async function editProduct(product) {
    setFormData({
      name: product.name || '',
      category_id: product.category_id || leafCategories[0]?.id || '',
      school_id: product.school_id || '',
      cost_price: product.cost_price ? String(product.cost_price) : '',
      price: String(product.price || ''),
      barcode: product.barcode || '',
      icon: product.icon || '📦',
    })

    // Load existing variants from DB (or clear in dev mode)
    if (window.api) {
      try {
        const res = await window.api.products.getById(product.id)
        if (res.ok && res.data?.variants) {
          setVariants(res.data.variants)
        } else {
          setVariants([])
        }
      } catch {
        setVariants([])
      }
    } else {
      setVariants([])
    }

    setEditingId(product.id)
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      ...BLANK_FORM,
      category_id: leafCategories[0]?.id || categories[0]?.id || '',
    })
    setVariants([])
    setNewVariant({ color: '', color_hex: '#1a3a5c', size: '', stock_qty: '' })
    setEditingId(null)
    setShowForm(false)
  }

  function guessColumnMap(headers) {
    const initial = {}
    for (const h of headers) {
      const low = h.toLowerCase()
      if (low.includes('name') && !low.includes('category') && !low.includes('school')) initial[h] = 'name'
      else if ((low.includes('sell') && low.includes('price')) || (low === 'price' && !low.includes('cost')))
        initial[h] = 'price'
      else if (low.includes('cost')) initial[h] = 'cost_price'
      else if (low.includes('barcode') || low === 'upc' || low === 'ean') initial[h] = 'barcode'
      else if (low.includes('category') && !low.includes('sub')) initial[h] = 'category'
      else if (low.includes('subcat')) initial[h] = 'subcategory'
      else if (low.includes('color')) initial[h] = 'color'
      else if (low.includes('size')) initial[h] = 'size'
      else if (low.includes('stock') || low === 'qty' || low.includes('quantity')) initial[h] = 'stock_qty'
      else if (low.includes('sku')) initial[h] = 'sku'
      else if (low.includes('desc')) initial[h] = 'description'
    }
    return initial
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const { headers, rows } = parseCsvSimple(String(reader.result))
      if (!headers.length) {
        toast.error('CSV has no header row')
        return
      }
      setCsvHeaders(headers)
      setCsvRows(rows)
      setColumnMap(guessColumnMap(headers))
      setImportOpen(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function runCsvImport() {
    const defaultCat = leafCategories[0]?.id || categories[0]?.id
    if (!defaultCat) {
      toast.error('Load categories first')
      return
    }
    const mapped = csvRows
      .map((row) => {
        const o = {}
        for (const col of csvHeaders) {
          const field = columnMap[col]
          if (!field) continue
          o[field] = row[col]
        }
        let category_id = null
        const subName = o.subcategory ? String(o.subcategory).trim().toLowerCase() : ''
        const catName = o.category ? String(o.category).trim().toLowerCase() : ''
        if (subName) {
          const leaf = leafCategories.find(
            (c) =>
              c.name.toLowerCase() === subName ||
              c.path_label?.toLowerCase().endsWith(subName)
          )
          category_id = leaf?.id || null
        }
        if (!category_id && catName) {
          category_id =
            leafCategories.find((c) => c.path?.[0]?.toLowerCase() === catName)?.id ||
            categories.find((c) => c.name.toLowerCase() === catName)?.id ||
            null
        }
        return {
          name: o.name ? String(o.name).trim() : '',
          price: o.price,
          cost_price: o.cost_price,
          barcode: o.barcode,
          category_id: category_id || defaultCat,
          subcategory: o.subcategory ? String(o.subcategory).trim() : '',
          color: o.color,
          size: o.size,
          stock_qty: o.stock_qty,
          sku: o.sku,
          description: o.description,
        }
      })
      .filter((r) => r.name && r.price !== undefined && r.price !== '')

    if (!mapped.length) {
      toast.error('No valid rows — check name and price columns')
      return
    }

    setImporting(true)
    try {
      if (!window.api) throw new Error('API unavailable')
      const res = await window.api.products.importMapped({ rows: mapped, default_category_id: defaultCat })
      if (!res.ok) throw new Error(res.error)
      const { imported, failed } = res.data
      toast.success(`Imported ${imported} product(s)`)
      if (failed?.length) toast.warning(`${failed.length} row(s) failed — check for duplicate barcodes`)
      setImportOpen(false)
      await loadProducts()
    } catch (err) {
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {!showForm && (
          <div className="flex items-center gap-2">
            <label className="btn-secondary cursor-pointer inline-flex items-center">
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
              Import CSV
            </label>
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
              + Add Product
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">{editingId ? 'Edit Product' : 'New Product'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Product Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Navy School Trouser"
                />
              </div>

              <div>
                <label className="label">Cost Price (Ksh.)</label>
                <input
                  type="number"
                  className="input"
                  value={formData.cost_price}
                  onChange={e => setFormData({ ...formData, cost_price: e.target.value })}
                  placeholder="e.g. 800"
                  min="0"
                />
              </div>

              <div>
                <label className="label">Selling Price (Ksh.) *</label>
                <input
                  type="number"
                  className="input"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1150"
                  min="0"
                />
              </div>

              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select category</option>
                  {leafCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {optionLabel(cat)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Pick a leaf category (e.g. School Uniforms › Pullovers). Add new ones under Categories.
                </p>
              </div>

              <div>
                <label className="label">School Badge (Optional)</label>
                <select
                  className="input"
                  value={formData.school_id}
                  onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                >
                  <option value="">No Badge (Plain)</option>
                  {schoolBadgeOptions.map((school) => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Barcode</label>
                <input
                  type="text"
                  className="input"
                  value={formData.barcode}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="e.g., 6291041500217"
                />
              </div>

              <div>
                <label className="label">Icon (emoji)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                  maxLength="2"
                  placeholder="📦"
                />
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-gray-700">
                Variants
                {editingId && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    (Existing variants shown · add new ones below)
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-5 gap-2">
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Color"
                  value={newVariant.color}
                  onChange={e => setNewVariant({ ...newVariant, color: e.target.value })}
                />
                <input
                  type="color"
                  className="input"
                  value={newVariant.color_hex}
                  onChange={e => setNewVariant({ ...newVariant, color_hex: e.target.value })}
                />
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Size"
                  value={newVariant.size}
                  onChange={e => setNewVariant({ ...newVariant, size: e.target.value })}
                />
                <input
                  type="number"
                  className="input text-sm"
                  placeholder="Stock"
                  value={newVariant.stock_qty}
                  onChange={e => setNewVariant({ ...newVariant, stock_qty: e.target.value })}
                  min="0"
                />
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="btn-secondary"
                >
                  Add
                </button>
              </div>

              {variants.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                  {variants.map(v => (
                    <div key={v.id} className="flex items-center justify-between bg-white p-2 rounded text-sm">
                      <span>
                        <span
                          className="inline-block w-4 h-4 rounded border mr-2"
                          style={{ backgroundColor: v.color_hex }}
                        />
                        {v.color} / Size {v.size} (×{v.stock_qty})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(v.id)}
                        className="text-red-500 hover:text-red-700 font-semibold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="btn-primary flex-1">
                {saving ? 'Saving...' : `${editingId ? 'Update' : 'Create'} Product`}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{product.icon || '📦'}</span>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {categories.find(c => c.id === product.category_id)?.name || product.category_name || 'Uncategorized'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">
                    Ksh. {product.price?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${
                      (product.total_stock ?? 0) === 0
                        ? 'text-red-600'
                        : (product.total_stock ?? 0) <= 5
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}>
                      {product.total_stock ?? '—'} units
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(product)}
                      className={`badge ${
                        !product.is_active ? 'badge-danger' : 'badge-success'
                      }`}
                    >
                      {!product.is_active ? 'Inactive' : 'Active'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => editProduct(product)}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => requestDelete(product)}
                        className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No products yet. Add one to get started.</p>
          </div>
        )}
      </div>

      {/* ── CSV Import mapping ── */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,20,40,0.6)' }}
          onClick={(e) => e.target === e.currentTarget && setImportOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-head font-bold text-lg">Map CSV columns</h3>
              <p className="text-sm text-gray-500 mt-1">
                {csvRows.length} data rows · Match each file column to a database field (category can be a category
                name).
              </p>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              {csvHeaders.map((h) => (
                <div key={h} className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-mono font-semibold text-gray-800 min-w-[120px] truncate" title={h}>
                    {h}
                  </span>
                  <select
                    className="input flex-1 min-w-[200px] text-sm"
                    value={columnMap[h] || ''}
                    onChange={(e) => setColumnMap({ ...columnMap, [h]: e.target.value })}
                  >
                    {IMPORT_FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value || 'ignore'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setImportOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={importing} onClick={runCsvImport}>
                {importing ? 'Importing…' : `Import ${csvRows.length} rows`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(10,20,40,0.6)' }}
             onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-7 w-full max-w-sm mx-4 shadow-modal">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🗑️</div>
              <h3 className="font-head font-bold text-lg text-gray-900 mb-1">Delete Product?</h3>
              <p className="text-sm text-gray-500">
                <strong className="text-gray-800">"{confirmDelete.name}"</strong> and all its variants will be permanently removed.
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-head font-semibold text-gray-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="flex-[2] py-3 rounded-xl bg-red-500 text-white font-head font-bold cursor-pointer hover:bg-red-600"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
