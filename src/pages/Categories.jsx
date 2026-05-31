import { useState, useEffect } from 'react'
import { supabase, getCurrentUser } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Plus } from 'lucide-react'
import { DEFAULT_CATEGORIES } from '../lib/categories'
import { CategoryIcon } from '../lib/categoryIcons'

const EMOJI_OPTIONS = ['🏠', '🎮', '🐾', '🌿', '✈️', '🎓', '💊', '🎁', '🍕', '☕', '🏋️', '🎵', '🚀', '🎨', '🐶', '💻']

function Categories() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => { fetchCategories() }, [])

  async function fetchCategories() {
    setLoading(true)
    try {
      const user = await getCurrentUser()
      const { data, error } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')
      if (error?.code === '42P01') {
        setUnavailable(true)
      } else {
        setCategories(data || [])
      }
    } catch {
      setUnavailable(true)
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!newName.trim()) { setError('Enter a name.'); return }
    if (!newIcon) { setError('Pick an icon.'); return }

    setSaving(true)
    const user = await getCurrentUser()
    const { error: err } = await supabase.from('user_categories').insert({
      user_id: user.id,
      name: newName.trim().toLowerCase(),
      icon: newIcon,
    })

    if (err) {
      setError('Failed to save. Run the migration first.')
    } else {
      setNewName('')
      setNewIcon('')
      setShowAdd(false)
      fetchCategories()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('user_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="px-5 pt-12 pb-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-9">
        <button onClick={() => navigate(-1)} className="text-ink-soft active:opacity-60">
          <ArrowLeft size={20} />
        </button>
        <p className="text-2xl font-semibold text-ink tracking-tight">Categories</p>
      </div>

      <p className="eyebrow mb-3 px-1">Default</p>
      <div className="flex flex-wrap gap-2 mb-9">
        {DEFAULT_CATEGORIES.map(cat => (
          <span key={cat} className="inline-flex items-center gap-1.5 text-[13px] px-3 py-1.5 bg-fill text-ink-soft capitalize rounded-full">
            <CategoryIcon category={cat} size={13} className="text-muted" />
            {cat}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4 px-1">
        <p className="eyebrow">Custom</p>
        {!unavailable && (
          <button
            onClick={() => { setShowAdd(true); setError('') }}
            className="w-8 h-8 bg-ink flex items-center justify-center rounded-full active:scale-95 transition-transform"
            aria-label="Add category"
          >
            <Plus size={15} className="text-paper" />
          </button>
        )}
      </div>

      {unavailable && (
        <p className="text-[13px] text-muted bg-fill rounded-2xl p-4 leading-relaxed">
          Custom categories require a database migration. See <code className="font-mono text-ink">supabase/migrations/</code> in the repo.
        </p>
      )}

      {!loading && !unavailable && (
        <div className="card p-2.5">
          {categories.length === 0 ? (
            <p className="text-[14px] text-muted px-3 py-4">No custom categories yet.</p>
          ) : categories.map((cat, i) => (
            <div key={cat.id}>
              {i > 0 && <div className="h-px bg-line mx-3" />}
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-fill flex items-center justify-center">
                    <span className="text-lg leading-none">{cat.icon}</span>
                  </div>
                  <p className="text-[15px] text-ink capitalize">{cat.name}</p>
                </div>
                <button onClick={() => handleDelete(cat.id)} className="text-faint active:text-danger p-1 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <>
          <div className="fixed inset-0 bg-ink/30 z-40" onClick={() => setShowAdd(false)} />
          <div className="sheet fixed bottom-0 left-0 right-0 z-50 px-6 pt-6 pb-9">
            <div className="flex items-center justify-between mb-7">
              <p className="text-lg font-semibold text-ink">New category</p>
              <button onClick={() => setShowAdd(false)}><X size={20} className="text-faint" /></button>
            </div>

            <p className="eyebrow mb-2.5">Name</p>
            <input
              type="text"
              placeholder="e.g. Hobbies"
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              autoFocus
              className="w-full text-base outline-none border-b border-line pb-2.5 mb-6 bg-transparent placeholder-faint focus:border-ink transition-colors"
            />

            <p className="eyebrow mb-3">Icon</p>
            <div className="flex flex-wrap gap-2.5 mb-7">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewIcon(emoji)}
                  className={`text-xl w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${
                    newIcon === emoji ? 'bg-ink scale-105' : 'bg-fill active:scale-95'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {error && <p className="text-[13px] text-danger mb-3">{error}</p>}

            <button onClick={handleAdd} disabled={saving} className="btn-primary w-full text-sm py-4">
              {saving ? 'Saving…' : 'Add category'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Categories
