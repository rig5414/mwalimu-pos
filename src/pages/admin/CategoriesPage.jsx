import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../../hooks/useToast'
import { buildTreeFromFlat, flattenCategoryTree, optionLabel } from '../../lib/categoryTree'
import ImageUploader from '../../components/ImageUploader'
import { useIconDisplay, updateIconCache } from '../../hooks/useIconDisplay'

function CategoryIcon({ categoryId, fallbackEmoji, className = "text-2xl" }) {
  const { imageUrl, isLoading, fallback } = useIconDisplay(categoryId, fallbackEmoji)

  if (isLoading) {
    return <span className={`w-8 h-8 rounded-lg bg-gray-100 animate-pulse flex-shrink-0`} />
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="w-8 h-8 object-cover rounded-lg flex-shrink-0"
      />
    )
  }

  return <span className={`flex-shrink-0 ${className}`}>{fallback}</span>
}

const TYPE_LABELS = {
  root: 'Root',
  subcategory: 'Subcategory',
  school: 'School',
  phase: 'Phase',
  category: 'Category',
}

const TYPE_COLORS = {
  root: 'bg-purple-100 text-purple-700',
  subcategory: 'bg-blue-100 text-blue-700',
  school: 'bg-green-100 text-green-700',
  phase: 'bg-amber-100 text-amber-700',
  category: 'bg-gray-100 text-gray-600',
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(10,20,40,0.6)' }}
         onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-modal">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="text-gray-800 font-semibold mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold text-gray-600 cursor-pointer hover:border-gray-300">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold cursor-pointer hover:bg-red-600">Delete</button>
        </div>
      </div>
    </div>
  )
}

function CategoryTreeNode({ node, onEdit, onDelete, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className="group flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200 cursor-pointer"
        style={{ marginLeft: depth * 20 }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`w-6 h-6 flex items-center justify-center rounded text-xs text-gray-400 hover:bg-gray-200 cursor-pointer flex-shrink-0 transition-transform ${hasChildren ? 'opacity-100' : 'opacity-0'}`}
        >
          {expanded ? '▾' : '▸'}
        </button>

        {/* Indent line */}
        {depth > 0 && <div className="w-4 h-px bg-gray-200 flex-shrink-0" />}

        {/* Icon */}
        <CategoryIcon categoryId={node.id} fallbackEmoji={node.icon} />

        {/* Name + path */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm truncate">{node.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[node.type] || TYPE_COLORS.category}`}>
              {TYPE_LABELS[node.type] || node.type || 'Category'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{node.path_label || node.name}</p>
        </div>

        {/* Stock info */}
        {node.product_count > 0 && (
          <span className="text-xs text-gray-400 tabular-nums bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
            {node.product_count} {node.product_count === 1 ? 'product' : 'products'}
          </span>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 cursor-pointer"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer"
          >
            Del
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="border-l-2 border-gray-100 ml-6">
          {node.children.map((child) => (
            <CategoryTreeNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [formData, setFormData] = useState({ name: '', icon: '📂', parent_id: '' })
  const [selectedImageData, setSelectedImageData] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const toast = useToast()

  const categoryTree = useMemo(() => buildTreeFromFlat(categories), [categories])
  const parentOptions = useMemo(
    () => flattenCategoryTree(categoryTree, { excludeId: editingId }),
    [categoryTree, editingId]
  )

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      if (window.api) {
        const res = await window.api.categories.getAll()
        if (!res.ok) throw new Error(res.error)
        setCategories(res.data || [])
      }
    } catch (err) {
      toast.error('Failed to load categories: ' + (err.message || 'Unknown error'))
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
      if (window.api) {
        const payload = {
          name: formData.name.trim(),
          icon: formData.icon,
          parent_id: formData.parent_id || null,
          sort_order: editingId
            ? categories.find((c) => c.id === editingId)?.sort_order || 0
            : categories.length,
        }
        
        const res = editingId
          ? await window.api.categories.update({ id: editingId, ...payload })
          : await window.api.categories.create(payload)
        
        if (!res.ok) throw new Error(res.error)

        const targetId = editingId || res.id || res.data?.id
        
        if (!editingId && pendingFile && targetId) {
          setUploadingIcon(true)
          const buffer = await pendingFile.arrayBuffer()
          const data = new Uint8Array(buffer)
          const uploadRes = await window.api.categories.uploadIcon({
            category_id: targetId,
            file: {
              name: pendingFile.name,
              size: pendingFile.size,
              type: pendingFile.type,
              data: data
            }
          })
          if (!uploadRes.ok) {
            toast.warning('Category created, but icon upload failed: ' + uploadRes.error)
          } else {
            if (selectedImageData) {
              updateIconCache(targetId, selectedImageData)
            }
          }
        }
        
        await loadCategories()
      }
      toast.success(`Category "${formData.name}" ${editingId ? 'updated' : 'added'}`)
      resetForm()
    } catch (err) {
      toast.error(err.message || 'Failed to save category')
    } finally {
      setSaving(false)
      setUploadingIcon(false)
    }
  }

  async function deleteCategory(categoryId) {
    const categoryName = categories.find((c) => c.id === categoryId)?.name
    try {
      if (window.api) {
        const res = await window.api.categories.delete(categoryId)
        if (!res.ok) throw new Error(res.error)
        if (res.data?.reassigned_count > 0) {
          toast.warning(`${res.data.reassigned_count} products moved to Uncategorized`)
        }
        await loadCategories()
      }
      toast.success(`Category "${categoryName}" deleted`)
    } catch (err) {
      toast.error(err.message || 'Failed to delete category')
    }
  }

  async function editCategory(category) {
    setFormData({
      name: category.name,
      icon: category.icon || '📂',
      parent_id: category.parent_id || '',
    })
    setEditingId(category.id)
    setShowForm(true)

    setUploadingIcon(true)
    try {
      if (window.api?.categories?.getIcon) {
        const res = await window.api.categories.getIcon({ category_id: category.id })
        if (res && res.ok && res.data) {
          setSelectedImageData(res.data)
        } else {
          setSelectedImageData(null)
        }
      }
    } catch (err) {
      console.error('Failed to load category icon:', err)
      setSelectedImageData(null)
    } finally {
      setUploadingIcon(false)
    }
  }

  async function handleUpload(file) {
    if (editingId) {
      setUploadingIcon(true)
      try {
        const buffer = await file.arrayBuffer()
        const data = new Uint8Array(buffer)
        const res = await window.api.categories.uploadIcon({
          category_id: editingId,
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            data: data
          }
        })
        if (!res.ok) throw new Error(res.error)
        
        const reader = new FileReader()
        reader.onload = () => {
          setSelectedImageData(reader.result)
          updateIconCache(editingId, reader.result)
        }
        reader.readAsDataURL(file)
        toast.success('Category icon uploaded successfully')
      } catch (err) {
        toast.error('Failed to upload category icon: ' + err.message)
      } finally {
        setUploadingIcon(false)
      }
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        setSelectedImageData(reader.result)
      }
      reader.readAsDataURL(file)
      setPendingFile(file)
    }
  }

  async function handleDelete() {
    if (editingId) {
      setUploadingIcon(true)
      try {
        const res = await window.api.categories.deleteIcon({ category_id: editingId })
        if (!res.ok) throw new Error(res.error)
        setSelectedImageData(null)
        updateIconCache(editingId, null)
        toast.success('Category icon deleted')
      } catch (err) {
        toast.error('Failed to delete category icon: ' + err.message)
      } finally {
        setUploadingIcon(false)
      }
    } else {
      setSelectedImageData(null)
      setPendingFile(null)
    }
  }

  function resetForm() {
    setFormData({ name: '', icon: '📂', parent_id: '' })
    setSelectedImageData(null)
    setPendingFile(null)
    setEditingId(null)
    setShowForm(false)
  }

  function confirmDelete(categoryId) {
    setDeleteConfirm(categoryId)
  }

  // Filter tree for search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return categoryTree

    function filterNodes(nodes) {
      return nodes.reduce((acc, node) => {
        const nameMatch = node.name.toLowerCase().includes(searchQuery.toLowerCase())
        const children = node.children ? filterNodes(node.children) : []
        if (nameMatch || children.length > 0) {
          acc.push({ ...node, children: children.length > 0 ? children : node.children })
        }
        return acc
      }, [])
    }
    return filterNodes(categoryTree)
  }, [categoryTree, searchQuery])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📂 Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Build a flexible tree: roots → subcategories → schools/phases. All IDs are UUIDs.
          </p>
        </div>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <span>+</span> Add Category
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree panel */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
              </svg>
              <input
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-colors"
                placeholder="Search categories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tree scrollable area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredTree.length > 0 ? filteredTree.map((node) => (
              <CategoryTreeNode
                key={node.id}
                node={node}
                onEdit={editCategory}
                onDelete={confirmDelete}
              />
            )) : (
              <div className="text-center py-16">
                <span className="text-5xl block mb-4">📂</span>
                <p className="text-gray-400 text-sm">
                  {searchQuery ? 'No categories match your search.' : 'No categories yet. Add a root category to get started.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Form panel */}
        {showForm && (
          <div className="w-[420px] flex-shrink-0 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Category' : 'New Category'}</h2>
              <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="label text-sm font-semibold text-gray-700">Name *</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Pullovers, Londiani Girls, Primary"
                  autoFocus
                />
              </div>

              {/* Parent */}
              <div>
                <label className="label text-sm font-semibold text-gray-700">Parent (optional)</label>
                <select
                  className="input mt-1"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                >
                  <option value="">None — top-level root</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {optionLabel(c, { showType: true })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Icon picker / Image Uploader */}
              <div>
                <label className="label text-sm font-semibold text-gray-700 mb-1.5 block">Category Icon</label>
                <ImageUploader
                  selectedImage={selectedImageData}
                  categoryId={editingId}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                  isLoading={uploadingIcon}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                  {saving ? 'Saving...' : `${editingId ? 'Update' : 'Create'} Category`}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${categories.find((c) => c.id === deleteConfirm)?.name}"? Products will be reassigned to Uncategorized.`}
          onConfirm={() => { deleteCategory(deleteConfirm); setDeleteConfirm(null) }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}