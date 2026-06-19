import { ShoppingCart, Utensils, Car, ShoppingBag, Heart, Tv, Tag, Receipt, DollarSign, PiggyBank } from 'lucide-react'

const ICONS = {
  groceries:     ShoppingCart,
  dining:        Utensils,
  transport:     Car,
  shopping:      ShoppingBag,
  health:        Heart,
  entertainment: Tv,
  bills:         Receipt,
  savings:       PiggyBank,
}

function getCategoryIcon(category) {
  return ICONS[category?.toLowerCase()] || Tag
}

/* eslint-disable react-hooks/static-components */
export function CategoryIcon({ category, isIncome, isSavings, size = 15, className = '', customIcons = {} }) {
  if (isSavings) return <PiggyBank size={size} className={className} />
  if (isIncome) return <DollarSign size={size} className={className} />
  const emoji = customIcons[category?.toLowerCase()]
  if (emoji) {
    return (
      <span style={{ fontSize: size, lineHeight: 1 }} role="img" aria-label={category}>
        {emoji}
      </span>
    )
  }
  const Icon = getCategoryIcon(category)
  return <Icon size={size} className={className} />
}
/* eslint-enable react-hooks/static-components */
