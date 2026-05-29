import { supabase } from './supabase'

export const DEFAULT_CATEGORIES = [
  'groceries', 'dining', 'transport', 'shopping', 'health', 'entertainment',
]

export async function fetchAllCategories(userId) {
  try {
    const { data } = await supabase
      .from('user_categories')
      .select('name')
      .eq('user_id', userId)
    const custom = (data || []).map(c => c.name)
    return [...DEFAULT_CATEGORIES, ...custom]
  } catch {
    return DEFAULT_CATEGORIES
  }
}

// Returns { categoryName: emoji } for all custom categories belonging to userId
export async function fetchCategoryIconMap(userId) {
  try {
    const { data } = await supabase
      .from('user_categories')
      .select('name, icon')
      .eq('user_id', userId)
    return Object.fromEntries((data || []).map(c => [c.name, c.icon]))
  } catch {
    return {}
  }
}
