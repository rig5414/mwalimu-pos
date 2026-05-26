import { useState, useRef } from 'react'
import { useToast } from '../hooks/useToast'

export default function ImageUploader({
  selectedImage,      // null | data URL string
  categoryId,         // UUID (optional)
  onUpload,           // callback(file) called when a file is selected
  onDelete,           // callback() called when deleting
  isLoading,          // boolean
}) {
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const toast = useToast()

  const validateAndProcessFile = (file) => {
    if (!file) return

    // Limit to 5MB
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast.error('Image is too large. Maximum size is 5MB.')
      return
    }

    // JPEG/PNG only
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type. Only JPEG and PNG formats are allowed.')
      return
    }

    // Call frontend handler to process file upload
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0])
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  return (
    <div className="space-y-3">
      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg, image/png"
        onChange={handleChange}
        disabled={isLoading}
      />

      {/* Main Drag-Drop / Preview Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={!selectedImage && !isLoading ? triggerFileInput : undefined}
        className={`relative h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${
          selectedImage
            ? 'border-gray-200 bg-gray-50'
            : isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-400 cursor-pointer'
        }`}
      >
        {selectedImage ? (
          /* Live Image Preview Mode */
          <div className="w-full h-full relative group">
            <img
              src={selectedImage}
              alt="Category Icon Preview"
              className="w-full h-full object-cover"
            />
            {/* Dark glass overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isLoading}
                className="px-3.5 py-2 bg-white/95 text-gray-800 hover:bg-white text-xs font-semibold rounded-xl cursor-pointer shadow-sm transition-transform active:scale-95"
              >
                Change Image
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                disabled={isLoading}
                className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-transform active:scale-95"
              >
                Delete Icon
              </button>
            </div>
          </div>
        ) : (
          /* Empty Drag-Drop Selection State */
          <div className="text-center p-4 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-primary flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110">
              🖼️
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Drag & drop your category image here
              </p>
              <p className="text-xs text-gray-400 mt-1">
                or <span className="text-primary font-bold hover:underline">browse files</span> (JPEG/PNG, max 5MB)
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
            <svg
              className="animate-spin h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-xs font-semibold text-primary">Uploading image...</span>
          </div>
        )}
      </div>

      {/* Selected Indicator for fallback */}
      {selectedImage && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-green-50/70 border border-green-100 rounded-xl">
          <span className="text-green-600 text-sm">✅</span>
          <span className="text-xs text-green-700 font-semibold">Rich category icon uploaded successfully</span>
        </div>
      )}
    </div>
  )
}
