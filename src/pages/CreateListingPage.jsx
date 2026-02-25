import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES, CONDITIONS, DEPARTMENTS } from '@/lib/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const textareaClass = 'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y'

export default function CreateListingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [successId, setSuccessId] = useState(null)

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    price: '',
    condition: '',
    pickup_location: '',
    course_dept: '',
    course_number: '',
  })
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  function handleField(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleImages(e) {
    const files = Array.from(e.target.files).slice(0, 4)
    setImageFiles(files)
    setImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  function removeImage(idx) {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required.')
    if (!form.category) return setError('Category is required.')
    setError('')
    setSubmitting(true)

    try {
      // Upload images
      const imageUrls = []
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, file)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
        imageUrls.push(data.publicUrl)
      }

      const payload = {
        seller_id: user.id,
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
        price: form.price !== '' ? parseFloat(form.price) : null,
        condition: form.condition || null,
        pickup_location: form.pickup_location.trim() || null,
        course_dept: form.category === 'textbooks' ? (form.course_dept || null) : null,
        course_number: form.category === 'textbooks' ? (form.course_number.trim() || null) : null,
        images: imageUrls,
      }

      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert(payload)
        .select('id')
        .single()
      if (insertError) throw insertError

      setSuccessId(listing.id)
      setSubmitting(false)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Post a Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1">
              <label className="text-sm font-medium">Category *</label>
              <select name="category" value={form.category} onChange={handleField} className={selectClass} required>
                <option value="">Select a category</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Title *</label>
              <Input
                name="title"
                value={form.title}
                onChange={handleField}
                placeholder="e.g. Intro to Psychology textbook"
                required
              />
            </div>

            {form.category === 'textbooks' && (
              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-sm font-medium">Department</label>
                  <select name="course_dept" value={form.course_dept} onChange={handleField} className={selectClass}>
                    <option value="">Select dept</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 w-28">
                  <label className="text-sm font-medium">Course #</label>
                  <Input
                    name="course_number"
                    value={form.course_number}
                    onChange={handleField}
                    placeholder="e.g. 101"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleField}
                placeholder="Describe the item — edition, wear, included accessories, etc."
                className={textareaClass}
              />
            </div>

            <div className="flex gap-3">
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium">Price ($)</label>
                <Input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleField}
                  placeholder="Leave blank for negotiable"
                />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-sm font-medium">Condition</label>
                <select name="condition" value={form.condition} onChange={handleField} className={selectClass}>
                  <option value="">Select condition</option>
                  {CONDITIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Pickup location</label>
              <Input
                name="pickup_location"
                value={form.pickup_location}
                onChange={handleField}
                placeholder="e.g. Andrews Hall, Curtis Hall lobby"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Photos (up to 4)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImages}
                className="text-sm"
              />
              {imagePreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="w-20 h-20 object-cover rounded-md border" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-maroon hover:bg-maroon-light text-white"
              disabled={submitting}
            >
              {submitting ? 'Posting…' : 'Post Listing'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {successId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Listing posted!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Thank you for posting! Your listing will be reviewed by our moderation team and will be available on the marketplace shortly.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate(`/listings/${successId}`)}
                className="w-full bg-maroon hover:bg-maroon-light text-white"
              >
                View my listing
              </Button>
              <Button
                onClick={() => navigate('/browse')}
                variant="outline"
                className="w-full"
              >
                Back to Browse
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
