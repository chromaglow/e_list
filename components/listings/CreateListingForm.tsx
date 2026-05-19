'use client'

import { useState, useRef, useEffect } from 'react'
import { isAllowedMagicBytes } from '@/lib/upload-validators'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export default function CreateListingForm({ token }: { token: string }) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileRef = useRef<File | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const file = e.target.files?.[0]
    if (file) {
      fileRef.current = file
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      fileRef.current = null
      setPreviewUrl(null)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return

    // Read form data synchronously before any await — React nullifies
    // e.currentTarget after the first async yield.
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const price = formData.get('price') as string
    const posterName = formData.get('posterName') as string
    const contactInfo = formData.get('contactInfo') as string

    setIsPending(true)
    setError(null)

    try {
      // Step 1: Magic byte validation
      if (fileRef.current) {
        const head = new Uint8Array(await fileRef.current.slice(0, 12).arrayBuffer())
        if (!isAllowedMagicBytes(head)) {
          setError('Please select a JPEG, PNG, or WebP image.')
          return
        }
      }

      // Step 2: Upload via server route (server calls Vercel Blob directly)
      let photoUrl: string | undefined
      if (fileRef.current) {
        try {
          const uploadRes = await fetch(`/${token}/api/upload`, {
            method: 'POST',
            body: fileRef.current,
            headers: {
              'x-upload-content-type': fileRef.current.type,
              'x-upload-filename': fileRef.current.name,
              'x-upload-size': String(fileRef.current.size),
            },
          })
          if (!uploadRes.ok) {
            const body = await uploadRes.json().catch(() => ({}))
            console.error('[upload] server error:', uploadRes.status, body)
            setError('Upload failed — please try again.')
            return
          }
          const { url } = await uploadRes.json()
          photoUrl = url
        } catch {
          setError('Upload failed — please try again.')
          return
        }
      }

      // Step 3: POST to listings route handler
      const res = await fetch(`/${token}/api/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: price || undefined,
          posterName,
          contactInfo,
          photoKey: photoUrl,
        }),
      })

      if (res.status === 400) {
        setError('Please check your entries and try again.')
        return
      }

      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        return
      }

      // Step 4: Store edit token and show success
      const { id, editToken } = await res.json()
      setSuccess(true)
      try {
        localStorage.setItem(`edit_token_${id}`, editToken)
      } catch {
        // localStorage unavailable (private mode, quota) — non-fatal
      }
      setTimeout(() => {
        setSuccess(false)
        fileRef.current = null
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        formRef.current?.reset()
      }, 3000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  const inputClass =
    'w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring'
  const labelClass = 'text-sm font-normal'

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6">
      <h2 className="text-lg font-semibold mb-6">Post an item</h2>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="e.g. Standing desk, wool blanket…"
            maxLength={200}
            required
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="What's the condition? Any size or colour details?"
            maxLength={2000}
            required
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <label htmlFor="price" className={labelClass}>
            Price
          </label>
          <input
            id="price"
            name="price"
            type="text"
            placeholder="e.g. $20 or 'make an offer'"
            maxLength={100}
            className={inputClass}
          />
        </div>

        {/* Your name */}
        <div className="space-y-1.5">
          <label htmlFor="posterName" className={labelClass}>
            Your name
          </label>
          <input
            id="posterName"
            name="posterName"
            type="text"
            placeholder="e.g. Sam"
            maxLength={100}
            required
            className={inputClass}
          />
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          <label htmlFor="contactInfo" className={labelClass}>
            How to reach you
          </label>
          <input
            id="contactInfo"
            name="contactInfo"
            type="text"
            placeholder="e.g. text 555-0123 or sam@email.com"
            maxLength={200}
            required
            className={inputClass}
          />
        </div>

        {/* Photo */}
        <div className="space-y-1.5">
          <label htmlFor="photo" className={labelClass}>
            Photo <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileChange}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-normal file:text-foreground cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · max 8 MB</p>
        </div>

        {/* Image preview */}
        {previewUrl && (
          <div className="mt-2 overflow-hidden rounded-lg">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full aspect-[4/3] object-cover"
            />
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <CheckCircle className="size-4 shrink-0" />
            Your listing is posted!
          </div>
        )}

        {/* Error display */}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Submit button */}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Posting…' : 'Post item'}
        </Button>
      </form>
    </div>
  )
}
