import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../../hooks/useToast'
import { buildTreeFromFlat, flattenCategoryTree } from '../../lib/categoryTree'
import CategoryPicker from '../../components/admin/CategoryPicker'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { posTheme } from '../../styles/posTheme'

const BLANK_FORM = {
  name: '',
  category_id: '',
  school_id: '',
  cost_price: '',
  price: '',
  barcode: '',
  icon: '📦',
}

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 40, label: '40' },
  { value: 50, label: '50' },
  { value: 'all', label: 'All' },
]

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

function ProductFormModal({
  show,
  editingId,
  formData,
  setFormData,
  variants,
  newVariant,
  setNewVariant,
  leafCategories,
  schoolBadgeOptions,
  saving,
  onClose,
  onSubmit,
  onAddVariant,
  onRemoveVariant,
}) {
  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 pos-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="pos-glass-modal rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
      >
        <div
          className="px-6 py-4 border-b flex items-start justify-between gap-3 flex-shrink-0"
          style={{ borderColor: posTheme.panelBorder }}
        >
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: posTheme.gold }}>
              {editingId ? 'Update' : 'Create'}
            </p>
            <h2 id="product-form-title" className="font-head font-bold text-lg text-white">
              {editingId ? 'Edit Product' : 'New Product'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form id="product-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 pos-dark-scroll">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="pos-glass-label">Product name *</label>
              <input
                type="text"
                className="pos-glass-input mt-1.5"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Navy School Trouser"
                autoFocus
              />
            </div>

            <div>
              <label className="pos-glass-label">Cost price (Ksh)</label>
              <input
                type="number"
                className="pos-glass-input mt-1.5"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="800"
                min="0"
              />
            </div>

            <div>
              <label className="pos-glass-label">Selling price (Ksh) *</label>
              <input
                type="number"
                className="pos-glass-input mt-1.5"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="1150"
                min="0"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="pos-glass-label">Category *</label>
              <CategoryPicker
                value={formData.category_id}
                onChange={(category_id) => setFormData({ ...formData, category_id })}
                leaves={leafCategories}
                placeholder="Select leaf category…"
                hint="Pick the deepest folder — e.g. School Uniforms › Pullovers › Plain."
              />
            </div>

            <div>
              <label className="pos-glass-label">School badge (optional)</label>
              <select
                className="pos-glass-select mt-1.5"
                value={formData.school_id}
                onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
              >
                <option value="">No badge (plain)</option>
                {schoolBadgeOptions.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="pos-glass-label">Barcode</label>
              <input
                type="text"
                className="pos-glass-input mt-1.5"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="6291041500217"
              />
            </div>

            <div>
              <label className="pos-glass-label">Icon (emoji)</label>
              <input
                type="text"
                className="pos-glass-input mt-1.5 w-24 text-center text-xl"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                maxLength={2}
                placeholder="📦"
              />
            </div>
          </div>

          <div
            className="space-y-3 pt-4 border-t"
            style={{ borderColor: posTheme.panelBorder }}
          >
            <div>
              <h3 className="font-head font-semibold text-white text-sm">Variants</h3>
              {editingId && (
                <p className="text-xs mt-0.5" style={{ color: posTheme.textMuted }}>
                  Existing variants shown below — add new rows before saving.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <input
                type="text"
                className="pos-glass-input text-sm"
                placeholder="Color"
                value={newVariant.color}
                onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
              />
              <input
                type="color"
                className="pos-glass-input h-[44px] p-1 cursor-pointer"
                value={newVariant.color_hex}
                onChange={(e) => setNewVariant({ ...newVariant, color_hex: e.target.value })}
                title="Color swatch"
              />
              <input
                type="text"
                className="pos-glass-input text-sm"
                placeholder="Size"
                value={newVariant.size}
                onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
              />
              <input
                type="number"
                className="pos-glass-input text-sm"
                placeholder="Stock"
                value={newVariant.stock_qty}
                onChange={(e) => setNewVariant({ ...newVariant, stock_qty: e.target.value })}
                min="0"
              />
              <button type="button" onClick={onAddVariant} className="pos-btn-ghost text-sm font-semibold rounded-xl">
                + Add
              </button>
            </div>

            {variants.length > 0 && (
              <div
                className="space-y-2 max-h-36 overflow-y-auto rounded-xl p-2 pos-dark-scroll"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-white/90 flex items-center gap-2 min-w-0 truncate">
                      <span
                        className="inline-block w-4 h-4 rounded border border-white/20 flex-shrink-0"
                        style={{ backgroundColor: v.color_hex }}
                      />
                      {v.color} / {v.size} (×{v.stock_qty})
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveVariant(v.id)}
                      className="text-red-300 hover:text-red-200 font-bold flex-shrink-0 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div
          className="px-6 py-4 border-t flex gap-3 flex-shrink-0"
          style={{ borderColor: posTheme.panelBorder }}
        >
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl pos-btn-ghost font-head font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="flex-[1.4] py-3 rounded-xl pos-btn-gold font-head font-bold disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRows, setCsvRows] = useState([])
  const [columnMap, setColumnMap] = useState({})
  const [importing, setImporting] = useState(false)
  const [formData, setFormData] = useState(BLANK_FORM)
  const [variants, setVariants] = useState([])
  const [newVariant, setNewVariant] = useState({ color: '', color_hex: '#1a3a5c', size: '', stock_qty: '' })
  const [leafCategories, setLeafCategories] = useState([])
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const toast = useToast()

  const schoolsRoot = useMemo(
    () => categories.find((c) => !c.parent_id && c.name === 'Schools'),
    [categories]
  )
  const schoolBadgeOptions = useMemo(
    () => categories.filter((c) => c.parent_id === schoolsRoot?.id),
    [categories, schoolsRoot]
  )

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.path_label?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.school_name?.toLowerCase().includes(q)
    )
  }, [products, search])

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1
    return Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  }, [filteredProducts.length, pageSize])

  const pagedProducts = useMemo(() => {
    if (pageSize === 'all') return filteredProducts
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

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
          window.api.categories.getProductLeaves?.() ||
            window.api.categories.getLeaves?.() ||
            window.api.categories.getAll(),
        ])
        if (!allRes.ok) throw new Error(allRes.error)
        if (allRes.data?.length) setCategories(allRes.data)
        if (leavesRes.ok && leavesRes.data?.length) {
          setLeafCategories(leavesRes.data)
        } else if (allRes.data?.length) {
          const tree = buildTreeFromFlat(allRes.data)
          setLeafCategories(flattenCategoryTree(tree, { leavesOnly: true }))
        }
      }
    } catch {
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
      }
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  function handleAddVariant() {
    if (
      !newVariant.color.trim() ||
      !newVariant.size.trim() ||
      Number(newVariant.stock_qty) < 0 ||
      newVariant.stock_qty === ''
    ) {
      toast.error('Please fill color and size. Stock qty must be 0 or more.')
      return
    }
    setVariants((prev) => [
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
  }

  function removeVariant(variantId) {
    setVariants((prev) => prev.filter((v) => v.id !== variantId))
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
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: nextActive } : p)))
      toast.info(`"${product.name}" marked as ${nextActive ? 'active' : 'inactive'}`)
    } catch (err) {
      toast.error(err.message || 'Failed to update status')
    }
  }

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
      setProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id))
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

    if (window.api) {
      try {
        const res = await window.api.products.getById(product.id)
        setVariants(res.ok && res.data?.variants ? res.data.variants : [])
      } catch {
        setVariants([])
      }
    } else {
      setVariants([])
    }

    setEditingId(product.id)
    setShowForm(true)
  }

  function openCreateForm() {
    setFormData({
      ...BLANK_FORM,
      category_id: leafCategories[0]?.id || '',
    })
    setVariants([])
    setNewVariant({ color: '', color_hex: '#1a3a5c', size: '', stock_qty: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function resetForm() {
    setFormData({ ...BLANK_FORM, category_id: leafCategories[0]?.id || '' })
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
            (c) => c.name.toLowerCase() === subName || c.path_label?.toLowerCase().endsWith(subName)
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
      if (failed?.length) toast.warning(`${failed.length} row(s) failed`)
      setImportOpen(false)
      await loadProducts()
    } catch (err) {
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const rangeStart = filteredProducts.length === 0 ? 0 : pageSize === 'all' ? 1 : (currentPage - 1) * pageSize + 1
  const rangeEnd =
    pageSize === 'all'
      ? filteredProducts.length
      : Math.min(currentPage * pageSize, filteredProducts.length)

  return (
    <div className="admin-page pos-dark-scroll space-y-4">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Products"
        subtitle="Assign each product to a leaf category from your taxonomy."
        actions={
          <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-72">
            <div className="flex flex-wrap gap-2 justify-end">
              <label className="btn-secondary cursor-pointer inline-flex items-center min-h-[40px] px-4 rounded-xl text-sm">
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
                Import CSV
              </label>
              <button
                type="button"
                onClick={openCreateForm}
                className="min-h-[40px] px-5 rounded-xl pos-btn-gold font-head font-bold text-sm"
              >
                + Add product
              </button>
            </div>
            <div className="pos-search-bar min-h-[40px] py-1 w-full">
              <svg
                className="w-4 h-4 flex-shrink-0"
                style={{ color: posTheme.textMuted }}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="admin-glass-panel overflow-hidden admin-fade-in">
        <div
          className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: posTheme.panelBorder }}
        >
          <p className="text-sm" style={{ color: posTheme.textMuted }}>
            {filteredProducts.length === 0
              ? 'No products'
              : pageSize === 'all'
                ? `Showing all ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}`
                : `Showing ${rangeStart}–${rangeEnd} of ${filteredProducts.length}`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: posTheme.textMuted }}>
              Rows
            </span>
            <select
              className="pos-glass-select !w-auto !min-w-[72px] !py-2 !text-sm"
              value={pageSize}
              onChange={(e) => {
                const v = e.target.value
                setPageSize(v === 'all' ? 'all' : Number(v))
              }}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto admin-category-scroll pos-dark-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: posTheme.panelBorder }}>
                {['Name', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                      h === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                    style={{ color: posTheme.textMuted }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-b transition-colors hover:bg-white/[0.04]"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">{product.icon || '📦'}</span>
                      <span className="font-medium text-white truncate">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: posTheme.textSecondary }}>
                    <span className="block truncate max-w-[240px]" title={product.path_label}>
                      {product.path_label || product.category_name || 'Uncategorized'}
                    </span>
                    {product.school_name && (
                      <span className="text-[10px] admin-badge admin-badge-info mt-1 inline-flex">
                        {product.school_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: posTheme.gold }}>
                    Ksh {Number(product.price || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`admin-badge ${
                        (product.total_stock ?? 0) === 0
                          ? 'admin-badge-danger'
                          : (product.total_stock ?? 0) <= 5
                            ? 'admin-badge-warning'
                            : 'admin-badge-success'
                      }`}
                    >
                      {product.total_stock ?? 0} units
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(product)}
                      className={`admin-badge cursor-pointer ${product.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => editProduct(product)}
                        className="admin-cat-action admin-cat-action--edit"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(product)}
                        className="admin-cat-action admin-cat-action--danger"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagedProducts.length === 0 && (
            <div className="text-center py-14 px-4 text-sm" style={{ color: posTheme.textMuted }}>
              {search.trim() ? 'No products match your search.' : 'No products yet. Add one to get started.'}
            </div>
          )}
        </div>

        {pageSize !== 'all' && totalPages > 1 && (
          <div
            className="px-4 py-3 border-t flex items-center justify-between gap-3 flex-wrap"
            style={{ borderColor: posTheme.panelBorder }}
          >
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="admin-cat-action disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-xs tabular-nums" style={{ color: posTheme.textMuted }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="admin-cat-action disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <ProductFormModal
        show={showForm}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        variants={variants}
        newVariant={newVariant}
        setNewVariant={setNewVariant}
        leafCategories={leafCategories}
        schoolBadgeOptions={schoolBadgeOptions}
        saving={saving}
        onClose={resetForm}
        onSubmit={handleSubmit}
        onAddVariant={handleAddVariant}
        onRemoveVariant={removeVariant}
      />

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pos-overlay"
          onClick={(e) => e.target === e.currentTarget && setImportOpen(false)}
        >
          <div className="pos-glass-modal rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b" style={{ borderColor: posTheme.panelBorder }}>
              <h3 className="font-head font-bold text-lg text-white">Map CSV columns</h3>
              <p className="text-sm mt-1" style={{ color: posTheme.textMuted }}>
                {csvRows.length} data rows
              </p>
            </div>
            <div className="overflow-y-auto p-6 space-y-3 pos-dark-scroll flex-1">
              {csvHeaders.map((h) => (
                <div key={h} className="flex flex-wrap items-center gap-3">
                  <span
                    className="text-sm font-mono font-semibold text-white min-w-[120px] truncate"
                    title={h}
                  >
                    {h}
                  </span>
                  <select
                    className="pos-glass-select flex-1 min-w-[200px] text-sm"
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
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: posTheme.panelBorder }}>
              <button type="button" className="pos-btn-ghost px-5 py-2.5 rounded-xl" onClick={() => setImportOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="pos-btn-gold px-5 py-2.5 rounded-xl font-bold"
                disabled={importing}
                onClick={runCsvImport}
              >
                {importing ? 'Importing…' : `Import ${csvRows.length} rows`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center pos-overlay"
          onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="pos-glass-modal rounded-2xl p-7 w-full max-w-sm mx-4">
            <div className="text-3xl mb-3">🗑️</div>
            <h3 className="font-head font-bold text-lg text-white mb-2">Delete product?</h3>
            <p className="text-sm mb-6" style={{ color: posTheme.textMuted }}>
              <strong className="text-white">{confirmDelete.name}</strong> and all variants will be removed permanently.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 py-3 rounded-xl pos-btn-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="flex-[2] py-3 rounded-xl font-bold text-white cursor-pointer"
                style={{ background: 'rgba(248,113,113,0.35)', border: '1px solid rgba(248,113,113,0.5)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
