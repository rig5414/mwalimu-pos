import { useState, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'

const BLANK_FORM = {
  name: '',
  category_id: '',
  subcategory: '',
  school_id: '',
  cost_price: '',
  price: '',
  barcode: '',
  icon: '📦',
}

const CATEGORY_SUBCATEGORIES = {
  'school-uniforms': ['Pullovers', 'Shirts', 'Trousers', 'Dresses', 'Half Sweaters', 'Socks', 'Skirts', 'Marvins', 'Gloves'],
  'games-attires': ['Tshirts', 'Tracksuits', 'Games Shorts', 'Wrappers Bloomers', 'Jersey', 'Girls Shorts'],
  footwear: ['Toughees', 'Studeez', 'Semi + Toughees', 'Rubber Shoes', 'Slippers', 'Crocs', 'Bata Breathers'],
  'inner-wear': ['Boxers', 'Panties', 'Vests', 'Sports Bra'],
  beddings: ['Blankets', 'Bed Covers', 'Bedsheets', 'Pajamas', 'Nightdress', 'Towels'],
  'school-bags': ['Backpacks', 'Duffel Bags', 'Lunch Bags'],
  schools: ['Londiani Christian Academy', 'Londiani Junior Secondary'],
}

const SCHOOL_ITEMS = ['Pullover', 'Half Sweater', 'Shirt', 'Dress', 'Girls Trouser', 'Long Trouser', 'Tracksuit', 'Socks', 'Tie', 'Marvin', 'Trouser', 'Tshirt', 'Girls Socks', 'Boys Socks']



export default function ProductsPage() {
  const [products, setProducts]         = useState([])
  const [categories, setCategories]     = useState([])
  const [showForm, setShowForm]         = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [saving, setSaving]             = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // product to confirm deletion
  const [formData, setFormData]         = useState(BLANK_FORM)
  const [variants, setVariants]         = useState([])
  const [newVariant, setNewVariant]     = useState({ color: '', color_hex: '#1a3a5c', size: '', stock_qty: '' })
  const [selectedSchoolItem, setSelectedSchoolItem] = useState('')
  const toast = useToast()

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  useEffect(() => {
    const validSubcats = CATEGORY_SUBCATEGORIES[formData.category_id] || []
    if (formData.subcategory && !validSubcats.includes(formData.subcategory)) {
      setFormData(prev => ({ ...prev, subcategory: '' }))
    }
  }, [formData.category_id, formData.subcategory])

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
        const res = await window.api.categories.getAll()
        if (!res.ok) throw new Error(res.error)
        if (res.data?.length) {
          setCategories(res.data)
          setFormData(prev => ({ ...prev, category_id: prev.category_id || res.data[0].id }))
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
            subcategory: formData.subcategory.trim(),
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
            subcategory: formData.subcategory.trim(),
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
      category_id: product.category_id || categories[0]?.id || '',
      subcategory: product.subcategory || '',
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
      category_id: categories[0]?.id || '',
    })
    setVariants([])
    setNewVariant({ color: '', color_hex: '#1a3a5c', size: '', stock_qty: '' })
    setSelectedSchoolItem('')
    setEditingId(null)
    setShowForm(false)
  }

  const categorySubcategories = CATEGORY_SUBCATEGORIES[formData.category_id] || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Product
          </button>
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
                  onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Subcategory</label>
                <select
                  className="input"
                  value={formData.subcategory}
                  onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                >
                  <option value="">Select subcategory</option>
                  {categorySubcategories.map(subcat => (
                    <option key={subcat} value={subcat}>{subcat}</option>
                  ))}
                </select>
                {formData.category_id === 'schools' && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <select
                        className="input text-sm"
                        value={selectedSchoolItem}
                        onChange={e => setSelectedSchoolItem(e.target.value)}
                      >
                        <option value="">Quick pick school item</option>
                        {SCHOOL_ITEMS.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn-secondary px-3 py-2 text-sm whitespace-nowrap"
                        onClick={() => {
                          if (!formData.subcategory || !selectedSchoolItem) return
                          setFormData(prev => ({ ...prev, name: `${prev.subcategory} - ${selectedSchoolItem}` }))
                        }}
                      >
                        Use
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Pick school + item to auto-fill Product Name.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="label">School Badge (Optional)</label>
                <select
                  className="input"
                  value={formData.school_id}
                  onChange={e => setFormData({ ...formData, school_id: e.target.value })}
                >
                  <option value="">No Badge (Plain)</option>
                  {categories.find(c => c.id === 'schools')?.id ? (
                    <option value="lca-placeholder">Londiani Christian Academy</option> // Temporary until schools category is properly nested
                  ) : null}
                  <option value="school_lca">Londiani Christian Academy</option>
                  <option value="school_lgc">Londiani Girls</option>
                  <option value="school_baraka">Baraka Senior</option>
                  <option value="school_sacred">Sacred Hills</option>
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
