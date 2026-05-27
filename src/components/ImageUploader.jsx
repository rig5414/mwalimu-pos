import { useState, useRef, useMemo, useEffect } from 'react'
import { useToast } from '../hooks/useToast'
import { normalizeCategoryIconSrc } from '../lib/categoryIcon'

export default function ImageUploader({
  selectedImage,
  categoryId,
  onUpload,
  onDelete,
  isLoading,
  variant = 'light',
}) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [previewBroken, setPreviewBroken] = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()

  const previewSrc = useMemo(
    () => normalizeCategoryIconSrc(selectedImage),
    [selectedImage]
  )

  useEffect(() => {
    setPreviewBroken(false)
  }, [previewSrc])

  const validateAndProcessFile = (file) => {
    if (!file) return

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast.error('Image is too large. Maximum size is 5MB.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type. Only JPEG and PNG formats are allowed.')
      return
    }

    setPreviewBroken(false)
    onUpload(file)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      validateAndProcessFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files?.[0]) {
      validateAndProcessFile(e.target.files[0])
    }
  }

  const triggerFileInput = (e) => {
    e?.stopPropagation?.()
    fileInputRef.current?.click()
  }

  const isGlass = variant === 'glass'
  const showPreview = previewSrc && !previewBroken

  return (
    <div className={`space-y-3 ${isGlass ? 'admin-glass-uploader' : ''}`}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg, image/png"
        onChange={handleChange}
        disabled={isLoading}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={!showPreview && !isLoading ? triggerFileInput : undefined}
        className={`admin-uploader-dropzone relative rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${
          showPreview
            ? isGlass
              ? 'border-white/20 bg-white/[0.04] p-4 min-h-[220px]'
              : 'border-gray-200 bg-gray-50 h-44'
            : isDragActive
            ? isGlass
              ? 'border-[#e8a020] bg-[rgba(232,160,32,0.08)] scale-[1.01] h-44'
              : 'border-primary bg-primary/5 scale-[1.01] h-44'
            : isGlass
            ? 'border-white/20 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/30 cursor-pointer h-44'
            : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-400 cursor-pointer h-44'
        }`}
      >
        {showPreview ? (
          <div className="w-full flex flex-col items-center gap-4">
            <div
              className={`flex items-center justify-center overflow-hidden rounded-xl ${
                isGlass
                  ? 'w-36 h-36 bg-white/[0.08] ring-1 ring-white/15'
                  : 'w-full h-36 bg-white'
              }`}
            >
              <img
                key={previewSrc}
                src={previewSrc}
                alt=""
                className="max-w-full max-h-full object-contain"
                onLoad={() => setPreviewBroken(false)}
                onError={() => setPreviewBroken(true)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isLoading}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-transform active:scale-95 ${
                  isGlass
                    ? 'bg-white/12 text-white border border-white/20 hover:bg-white/18'
                    : 'bg-white/95 text-gray-800 hover:bg-white shadow-sm'
                }`}
              >
                Change image
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewBroken(false)
                  onDelete()
                }}
                disabled={isLoading}
                className="px-3.5 py-2 bg-red-500/85 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-transform active:scale-95"
              >
                Remove icon
              </button>
            </div>
          </div>
        ) : previewBroken ? (
          <div className="text-center p-4 flex flex-col items-center gap-3">
            <p className={`text-sm ${isGlass ? 'text-white/70' : 'text-gray-600'}`}>
              Could not preview this image.
            </p>
            <button
              type="button"
              onClick={triggerFileInput}
              className="px-3.5 py-2 rounded-xl pos-btn-gold text-xs font-bold"
            >
              Choose another file
            </button>
          </div>
        ) : (
          <div className="text-center p-4 flex flex-col items-center gap-2">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                isGlass ? 'bg-white/10 text-[#e8a020]' : 'bg-blue-50 text-primary'
              }`}
            >
              🖼️
            </div>
            <div>
              <p className={`admin-uploader-title text-sm font-semibold ${isGlass ? 'text-white/90' : 'text-gray-800'}`}>
                Drag & drop your category image here
              </p>
              <p className={`admin-uploader-hint text-xs mt-1 ${isGlass ? 'text-white/45' : 'text-gray-400'}`}>
                or{' '}
                <span className={`font-bold hover:underline ${isGlass ? 'text-[#e8a020]' : 'text-primary'}`}>
                  browse files
                </span>{' '}
                (JPEG/PNG, max 5MB)
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px] ${
              isGlass ? 'bg-[rgba(10,25,47,0.75)]' : 'bg-white/70'
            }`}
          >
            <svg className={`animate-spin h-8 w-8 ${isGlass ? 'text-[#e8a020]' : 'text-primary'}`} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className={`text-xs font-semibold ${isGlass ? 'text-[#e8a020]' : 'text-primary'}`}>
              Uploading image…
            </span>
          </div>
        )}
      </div>

      {showPreview && (
        <div
          className={`admin-uploader-success flex items-center gap-2 px-3.5 py-2.5 rounded-xl border ${
            isGlass ? 'bg-green-500/10 border-green-400/30 text-green-200' : 'bg-green-50/70 border-green-100'
          }`}
        >
          <span className="text-sm">✅</span>
          <span className={`text-xs font-semibold ${isGlass ? 'text-green-200' : 'text-green-700'}`}>
            Icon ready — save the category to keep it
          </span>
        </div>
      )}
    </div>
  )
}
