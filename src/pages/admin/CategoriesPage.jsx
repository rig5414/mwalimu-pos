import { useState, useEffect, useMemo, useRef } from 'react'
import { useToast } from '../../hooks/useToast'
import { buildTreeFromFlat, flattenCategoryTree, collectDescendantIds, optionLabel } from '../../lib/categoryTree'
import { sortBrowseTreeRoots, filterDuplicateInnerwearNodes } from '../../lib/hierarchyNav'
import ImageUploader from '../../components/ImageUploader'
import { useIconDisplay, updateIconCache } from '../../hooks/useIconDisplay'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { normalizeCategoryIconSrc } from '../../lib/categoryIcon'
import { posTheme } from '../../styles/posTheme'

function CategoryIcon({ categoryId, fallbackEmoji, className = 'text-2xl' }) {
  const { imageUrl, isLoading, fallback } = useIconDisplay(categoryId, fallbackEmoji)

  if (isLoading) {
    return <span className="w-8 h-8 rounded-lg animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="w-8 h-8 object-cover rounded-lg flex-shrink-0 ring-1 ring-white/10"
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

const TYPE_BADGE = {
  root: 'admin-badge admin-badge-purple',
  subcategory: 'admin-badge admin-badge-info',
  school: 'admin-badge admin-badge-success',
  phase: 'admin-badge admin-badge-warning',
  category: 'admin-badge',
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pos-overlay"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="pos-glass-modal rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="text-white font-semibold mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl pos-btn-ghost font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold cursor-pointer text-white"
            style={{ background: 'rgba(248,113,113,0.35)', border: '1px solid rgba(248,113,113,0.5)' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryTreeNode({ node, onEdit, onDelete, onAddChild, depth = 0 }) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div className="admin-category-row group" style={{ marginLeft: depth * 16 }}>
        <button
          type="button"
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={`admin-category-row-toggle ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '▾' : '▸'}
        </button>

        <CategoryIcon categoryId={node.id} fallbackEmoji={node.icon} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">{node.name}</span>
            <span className={TYPE_BADGE[node.type] || TYPE_BADGE.category}>
              {TYPE_LABELS[node.type] || node.type || 'Category'}
            </span>
          </div>
          <p className="text-[11px] truncate mt-0.5" style={{ color: posTheme.textMuted }}>
            {node.path_label || node.name}
          </p>
        </div>

        {node.product_count > 0 && (
          <span
            className="text-xs tabular-nums px-2 py-1 rounded-full flex-shrink-0"
            style={{ color: posTheme.textSecondary, background: 'rgba(255,255,255,0.08)' }}
          >
            {node.product_count} {node.product_count === 1 ? 'product' : 'products'}
          </span>
        )}

        <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button type="button" onClick={() => onAddChild(node)} className="admin-cat-action admin-cat-action--add">
            + Sub
          </button>
          <button type="button" onClick={() => onEdit(node)} className="admin-cat-action admin-cat-action--edit">
            Edit
          </button>
          <button type="button" onClick={() => onDelete(node)} className="admin-cat-action admin-cat-action--danger">
            Del
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="admin-category-children">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryFormDrawer({
  show,
  editingId,
  formData,
  setFormData,
  parentOptions,
  selectedImageData,
  uploadingIcon,
  saving,
  onClose,
  onSubmit,
  onUpload,
  onDeleteIcon,
}) {
  if (!show) return null

  const parentName = parentOptions.find((c) => c.id === formData.parent_id)?.name
  const title = editingId
    ? 'Edit Category'
    : formData.parent_id
      ? `New subcategory under “${parentName || '…'}”`
      : 'New root category'

  return (
    <>
      <div className="admin-category-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="admin-category-drawer" role="dialog" aria-modal="true" aria-labelledby="category-drawer-title">
        <div className="admin-category-drawer-inner">
          <div className="px-5 py-4 border-b flex items-start justify-between gap-3 flex-shrink-0" style={{ borderColor: posTheme.panelBorder }}>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: posTheme.gold }}>
                {editingId ? 'Update' : 'Create'}
              </p>
              <h2 id="category-drawer-title" className="font-head font-bold text-lg text-white leading-snug">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer flex-shrink-0 text-xl"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="admin-category-drawer-scroll pos-dark-scroll">
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="pos-glass-label">Name *</label>
              <input
                type="text"
                className="pos-glass-input mt-1.5"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pullovers, Plain, Londiani Girls"
                autoFocus
              />
            </div>

            <div>
              <label className="pos-glass-label">Parent category</label>
              <select
                className="pos-glass-select mt-1.5"
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
              <p className="text-xs mt-2 leading-relaxed" style={{ color: posTheme.textMuted }}>
                Nest under any node — e.g. School Uniforms → Pullovers → Plain, or Schools → Londiani Girls → Shirts.
              </p>
            </div>

            <div>
              <label className="pos-glass-label mb-2 block">Category icon</label>
              <ImageUploader
                variant="glass"
                selectedImage={selectedImageData}
                categoryId={editingId}
                onUpload={onUpload}
                onDelete={onDeleteIcon}
                isLoading={uploadingIcon}
              />
            </div>

            <div className="flex gap-3 pt-2 sticky bottom-0 pb-1" style={{ background: 'linear-gradient(transparent, rgba(10,25,47,0.95) 24%)' }}>
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl pos-btn-ghost font-head font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={saving || uploadingIcon} className="flex-[1.4] py-3 rounded-xl pos-btn-gold font-head font-bold">
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create category'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </aside>
    </>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [browseTree, setBrowseTree] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [formData, setFormData] = useState({ name: '', icon: '📂', parent_id: '' })
  const [selectedImageData, setSelectedImageData] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const localPreviewRef = useRef(null)
  const toast = useToast()

  const revokeLocalPreview = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current)
      localPreviewRef.current = null
    }
  }

  const setPreviewFromFile = (file) => {
    revokeLocalPreview()
    const url = URL.createObjectURL(file)
    localPreviewRef.current = url
    setSelectedImageData(url)
  }

  const categoryTree = useMemo(() => {
    if (browseTree.length > 0) {
      return filterDuplicateInnerwearNodes(sortBrowseTreeRoots(browseTree))
    }
    return filterDuplicateInnerwearNodes(buildTreeFromFlat(categories))
  }, [browseTree, categories])

  const parentOptions = useMemo(() => {
    const excludeIds = editingId ? collectDescendantIds(categoryTree, editingId) : new Set()
    return flattenCategoryTree(categoryTree, { excludeIds })
  }, [categoryTree, editingId])

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return categoryTree

    function filterNodes(nodes) {
      return nodes.reduce((acc, node) => {
        const nameMatch = node.name.toLowerCase().includes(searchQuery.toLowerCase())
        const pathMatch = (node.path_label || '').toLowerCase().includes(searchQuery.toLowerCase())
        const children = node.children ? filterNodes(node.children) : []
        if (nameMatch || pathMatch || children.length > 0) {
          acc.push({ ...node, children: children.length > 0 ? children : node.children })
        }
        return acc
      }, [])
    }
    return filterNodes(categoryTree)
  }, [categoryTree, searchQuery])

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      if (window.api) {
        const [allRes, treeRes] = await Promise.all([
          window.api.categories.getAll(),
          window.api.categories.getBrowseTree?.() || Promise.resolve({ ok: false }),
        ])
        if (!allRes.ok) throw new Error(allRes.error)
        setCategories(allRes.data || [])
        if (treeRes.ok) setBrowseTree(treeRes.data || [])
      }
    } catch (err) {
      toast.error('Failed to load categories: ' + (err.message || 'Unknown error'))
    }
  }

  function openCreateForm(parentId = '') {
    revokeLocalPreview()
    setFormData({ name: '', icon: '📂', parent_id: parentId })
    setSelectedImageData(null)
    setPendingFile(null)
    setEditingId(null)
    setShowForm(true)
  }

  function openAddChild(parentNode) {
    openCreateForm(parentNode.id)
  }

  function resetForm() {
    revokeLocalPreview()
    setFormData({ name: '', icon: '📂', parent_id: '' })
    setSelectedImageData(null)
    setPendingFile(null)
    setEditingId(null)
    setShowForm(false)
  }

  useEffect(() => () => revokeLocalPreview(), [])

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
            ? categories.find((c) => c.id === editingId)?.sort_order
            : undefined,
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
              data,
            },
          })
          if (!uploadRes.ok) {
            toast.warning('Category created, but icon upload failed: ' + uploadRes.error)
          } else if (selectedImageData) {
            updateIconCache(targetId, selectedImageData)
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
    revokeLocalPreview()
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
        setSelectedImageData(res?.ok && res.data ? normalizeCategoryIconSrc(res.data) : null)
      }
    } catch (err) {
      console.error('Failed to load category icon:', err)
      setSelectedImageData(null)
    } finally {
      setUploadingIcon(false)
    }
  }

  async function handleUpload(file) {
    setPreviewFromFile(file)

    if (editingId) {
      setUploadingIcon(true)
      try {
        const buffer = await file.arrayBuffer()
        const data = new Uint8Array(buffer)
        const res = await window.api.categories.uploadIcon({
          category_id: editingId,
          file: { name: file.name, size: file.size, type: file.type, data },
        })
        if (!res.ok) throw new Error(res.error)

        const dataUrl = normalizeCategoryIconSrc(res.data?.dataUrl)
        if (dataUrl) {
          revokeLocalPreview()
          setSelectedImageData(dataUrl)
          updateIconCache(editingId, dataUrl)
        }
        toast.success('Category icon uploaded')
      } catch (err) {
        toast.error('Failed to upload icon: ' + err.message)
      } finally {
        setUploadingIcon(false)
      }
    } else {
      setPendingFile(file)
    }
  }

  async function handleDeleteIcon() {
    if (editingId) {
      setUploadingIcon(true)
      try {
        const res = await window.api.categories.deleteIcon({ category_id: editingId })
        if (!res.ok) throw new Error(res.error)
        revokeLocalPreview()
        setSelectedImageData(null)
        updateIconCache(editingId, null)
        toast.success('Category icon removed')
      } catch (err) {
        toast.error('Failed to remove icon: ' + err.message)
      } finally {
        setUploadingIcon(false)
      }
    } else {
      revokeLocalPreview()
      setSelectedImageData(null)
      setPendingFile(null)
    }
  }

  function confirmDelete(category) {
    if (category.children?.length > 0) {
      toast.error('Delete or move subcategories first')
      return
    }
    setDeleteConfirm(category.id)
  }

  return (
    <div className="admin-page h-full flex flex-col overflow-hidden pos-dark-scroll">
      <AdminPageHeader
        eyebrow="Catalog taxonomy"
        title="Categories"
        subtitle="Unlimited nesting — roots, subcategories, schools, phases, Plain/Striped, and more."
        actions={
          <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-72">
            <button
              type="button"
              onClick={() => openCreateForm()}
              className="min-h-[44px] px-5 rounded-xl pos-btn-gold font-head font-bold text-sm w-full sm:w-auto"
            >
              + Add category
            </button>
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
                placeholder="Search categories…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="admin-glass-panel admin-category-panel admin-fade-in admin-fade-in-delay-1">
        <div className="admin-category-scroll pos-dark-scroll space-y-0.5">
          {filteredTree.length > 0 ? (
            filteredTree.map((node) => (
              <CategoryTreeNode
                key={node.id}
                node={node}
                onEdit={editCategory}
                onDelete={confirmDelete}
                onAddChild={openAddChild}
              />
            ))
          ) : (
            <div className="text-center py-16 px-4">
              <span className="text-5xl block mb-4 opacity-80">📂</span>
              <p className="text-sm" style={{ color: posTheme.textMuted }}>
                {searchQuery ? 'No categories match your search.' : 'No categories yet. Add a root category to get started.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <CategoryFormDrawer
        show={showForm}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        parentOptions={parentOptions}
        selectedImageData={selectedImageData}
        uploadingIcon={uploadingIcon}
        saving={saving}
        onClose={resetForm}
        onSubmit={handleSubmit}
        onUpload={handleUpload}
        onDeleteIcon={handleDeleteIcon}
      />

      {deleteConfirm && (
        <ConfirmDialog
          message={`Delete ${categories.find((c) => c.id === deleteConfirm)?.name}? Only empty categories (no subcategories) can be deleted. Products here move to Uncategorized.`}
          onConfirm={() => {
            deleteCategory(deleteConfirm)
            setDeleteConfirm(null)
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  )
}
