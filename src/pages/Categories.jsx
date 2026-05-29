import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Plus } from 'lucide-react'
import { DEFAULT_CATEGORIES } from '../lib/categories'

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
      const { data: { user } } = await supabase.auth.getUser()
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
    const { data: { user } } = await supabase.auth.getUser()
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
    <div className="px-6 pt-10 pb-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400">
          <ArrowLeft size={20} />
        </button>
        <p className="text-2xl font-semibold text-black">Categories</p>
      </div>

      <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Default</p>
      <div className="flex flex-wrap gap-2 mb-8">
        {DEFAULT_CATEGORIES.map(cat => (
          <span key={cat} className="text-sm px-3 py-1.5 border border-gray-100 text-gray-400 capitalize rounded-full">
            {cat}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Custom</p>
        {!unavailable && (
          <button
            onClick={() => { setShowAdd(true); setError('') }}
            className="w-7 h-7 bg-black flex items-center justify-center rounded"
          >
            <Plus size={14} className="text-white" />
          </button>
        )}
      </div>

      {unavailable && (
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4">
          Custom categories require a database migration. See <code className="font-mono">supabase/migrations/</code> in the repo.
        </p>
      )}

      {!loading && !unavailable && (
        <>
          {categories.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No custom categories yet.</p>
          )}
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <p className="text-sm text-black capitalize">{cat.name}</p>
              </div>
              <button onClick={() => handleDelete(cat.id)} className="text-gray-300 active:text-red-400 p-1">
                <X size={16} />
              </button>
            </div>
          ))}
        </>
      )}

      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAdd(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white z-50 px-6 pt-5 pb-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <p className="text-base font-semibold">New category</p>
              <button onClick={() => setShowAdd(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Name</p>
            <input
              type="text"
              placeholder="e.g. Hobbies"
              value={newName}
              onChange={e => { setNewName(e.target.value); setError('') }}
              autoFocus
              className="w-full text-base outline-none border-b border-gray-200 pb-2 mb-5"
            />

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Icon</p>
            <div className="flex flex-wrap gap-3 mb-6">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewIcon(emoji)}
                  className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                    newIcon === emoji ? 'border-black bg-gray-50' : 'border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <button
              onClick={handleAdd}
              disabled={saving}
              className="w-full bg-black text-white text-sm font-medium py-4 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Add category'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Categories
