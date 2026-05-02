import { useState, useEffect } from 'react'
import { useToast } from '../../hooks/useToast'

// Updated categories matching client's business structure
const INITIAL_CATEGORIES = [
  { id: 'school-uniforms', name: 'School Uniforms', icon: '👔' },
  { id: 'games-attires', name: 'Games Attires', icon: '🏃' },
  { id: 'footwear', name: 'Footwear', icon: '👟' },
  { id: 'inner-wear', name: 'Inner Wear', icon: '🧦' },
  { id: 'beddings', name: 'Beddings', icon: '🛏️' },
  { id: 'school-bags', name: 'School Bags', icon: '🎒' },
  { id: 'schools', name: 'Schools', icon: '🏫' },
]

const ICONS = ['👔', '🎒', '🩳', '👟', '🧢', '👕', '👖', '👗', '🧥', '🎀', '🏅', '🧦', '🍱', '🥋', '🧳', '🏃', '🛏️', '🏫']

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    icon: '👔',
  })
  const toast = useToast()

  // Load categories
  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      if (window.api) {
        const res = await window.api.categories.getAll()
        if (res.ok) {
          setCategories(res.data)
        }
      } else {
        // Dev mode: use initial categories
        setCategories(INITIAL_CATEGORIES)
      }
    } catch (err) {
      toast.error('Failed to load categories')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter a category name')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const index = categories.findIndex((c) => c.id === editingId)
        if (window.api) {
          const res = await window.api.categories.update({
            id: editingId,
            name: formData.name.trim(),
            icon: formData.icon,
            sort_order: index,
          })
          if (!res.ok) throw new Error(res.error)
          await loadCategories()
        } else {
          setCategories(categories.map(c =>
            c.id === editingId ? { ...c, ...formData } : c
          ))
        }
        toast.success(`Category "${formData.name}" updated`)
      } else {
        if (window.api) {
          const res = await window.api.categories.create({
            name: formData.name.trim(),
            icon: formData.icon,
            sort_order: categories.length,
          })
          if (!res.ok) throw new Error(res.error)
          await loadCategories()
        } else {
          const newId = formData.name.toLowerCase().replace(/\s+/g, '-')
          if (categories.some(c => c.id === newId)) {
            toast.error('Category name already exists')
            return
          }
          setCategories([...categories, { id: newId, ...formData }])
        }
        toast.success(`Category "${formData.name}" added`)
      }
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(categoryId) {
    const categoryName = categories.find(c => c.id === categoryId)?.name
    try {
      if (window.api) {
        const res = await window.api.categories.delete(categoryId)
        if (!res.ok) throw new Error(res.error)
        if (res.data?.reassigned_count > 0) {
          toast.warning(`${res.data.reassigned_count} products moved to Uncategorized`)
        }
      }
      setCategories(categories.filter(c => c.id !== categoryId))
      toast.success(`Category "${categoryName}" deleted`)
    } catch (err) {
      toast.error(err.message || 'Failed to delete category')
    }
  }

  function editCategory(category) {
    setFormData({
      name: category.name,
      icon: category.icon,
    })
    setEditingId(category.id)
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      icon: '👔',
    })
    setEditingId(null)
    setShowForm(false)
  }

  async function reorderCategories(fromIndex, toIndex) {
    const newCategories = [...categories]
    const [moved] = newCategories.splice(fromIndex, 1)
    newCategories.splice(toIndex, 0, moved)
    setCategories(newCategories)

    if (window.api) {
      try {
        await Promise.all(
          newCategories.map((category, index) =>
            window.api.categories.update({
              id: category.id,
              name: category.name,
              icon: category.icon,
              sort_order: index,
            })
          )
        )
      } catch (_err) {
        toast.error('Failed to persist category order')
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Category
          </button>
        )}
      </div>

      {showForm && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold">{editingId ? 'Edit Category' : 'New Category'}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., School Uniforms"
                />
              </div>

              <div>
                <label className="label">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg border-2 transition-all ${
                        formData.icon === icon
                          ? 'border-primary bg-primary-light'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="btn-primary flex-1">
                {saving ? 'Saving...' : `${editingId ? 'Update' : 'Create'} Category`}
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

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category, index) => (
          <div key={category.id} className="card p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{category.icon}</div>
                <div>
                  <h3 className="font-bold text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-400">{category.id}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              {index > 0 && (
                <button
                  onClick={() => reorderCategories(index, index - 1)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="Move up"
                >
                  ↑
                </button>
              )}
              {index < categories.length - 1 && (
                <button
                  onClick={() => reorderCategories(index, index + 1)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="Move down"
                >
                  ↓
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => editCategory(category)}
                className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => deleteCategory(category.id)}
                className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No categories yet. Add one to get started.</p>
        </div>
      )}
    </div>
  )
}
