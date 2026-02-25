import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CATEGORIES, CONDITIONS, DEPARTMENTS } from '@/lib/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const textareaClass = 'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[100px] resize-y'

export default function EditListingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

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
  const [existingImages, setExistingImages] = useState([])
  const [newImageFiles, setNewImageFiles] = useState([])
  const [newImagePreviews, setNewImagePreviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true })
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    fetchListing()
  }, [user, id])

  async function fetchListing() {
    const { data, error } = await supabase.from('listings').select('*').eq('id', id).single()
    if (error || !data) { navigate('/browse', { replace: true }); return }
    if (data.seller_id !== user.id) { navigate(`/listings/${id}`, { replace: true }); return }

    setForm({
      title: data.title,
      category: data.category,
      description: data.description || '',
      price: data.price != null ? String(data.price) : '',
      condition: data.condition || '',
      pickup_location: data.pickup_location || '',
      course_dept: data.course_dept || '',
      course_number: data.course_number || '',
    })
    setExistingImages(data.images || [])
    setLoading(false)
  }

  function handleField(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleNewImages(e) {
    const slots = 4 - existingImages.length
    const files = Array.from(e.target.files).slice(0, slots)
    setNewImageFiles(files)
    setNewImagePreviews(files.map(f => URL.createObjectURL(f)))
  }

  function removeExisting(idx) {
    setExistingImages(prev => prev.filter((_, i) => i !== idx))
  }

  function removeNew(idx) {
    setNewImageFiles(prev => prev.filter((_, i) => i !== idx))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required.')
    if (!form.category) return setError('Category is required.')
    setError('')
    setSubmitting(true)

    try {
      const newUrls = []
      for (const file of newImageFiles) {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, file)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }

      const payload = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || null,
        price: form.price !== '' ? parseFloat(form.price) : null,
        condition: form.condition || null,
        pickup_location: form.pickup_location.trim() || null,
        course_dept: form.category === 'textbooks' ? (form.course_dept || null) : null,
        course_number: form.category === 'textbooks' ? (form.course_number.trim() || null) : null,
        images: [...existingImages, ...newUrls],
      }

      const { error: updateError } = await supabase.from('listings').update(payload).eq('id', id)
      if (updateError) throw updateError

      navigate(`/listings/${id}`)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  if (!user) return null

  if (loading) {
    return <div className="max-w-xl mx-auto px-4 py-12 text-shadow-gray">Loading…</div>
  }

  const totalImages = existingImages.length + newImageFiles.length

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
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
              <label className="text-sm font-medium">Photos ({totalImages}/4)</label>
              {existingImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {existingImages.map((src, i) => (
                    <div key={src} className="relative">
                      <img src={src} alt="" className="w-20 h-20 object-cover rounded-md border" />
                      <button
                        type="button"
                        onClick={() => removeExisting(i)}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {newImagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="w-20 h-20 object-cover rounded-md border border-dashed border-gray-400" />
                      <button
                        type="button"
                        onClick={() => removeNew(i)}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {newImagePreviews.length > 0 && existingImages.length === 0 && (
                <div className="flex gap-2 flex-wrap">
                  {newImagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="w-20 h-20 object-cover rounded-md border border-dashed border-gray-400" />
                      <button
                        type="button"
                        onClick={() => removeNew(i)}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {totalImages < 4 && (
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewImages}
                  className="text-sm"
                />
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                className="flex-1 bg-maroon hover:bg-maroon-light text-white"
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/listings/${id}`)}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
