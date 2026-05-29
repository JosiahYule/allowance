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
