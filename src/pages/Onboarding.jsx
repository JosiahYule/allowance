import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1) // 1=welcome, 2=income, 3=bills
  const [income, setIncome] = useState('')
  const [bills, setBills] = useState([]) // [{ description, amount, day }]
  const [billDesc, setBillDesc] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDay, setBillDay] = useState('')
  const [saving, setSaving] = useState(false)

  const displayName = user?.email?.split('@')[0] || 'there'
  const name = displayName.charAt(0).toUpperCase() + displayName.slice(1)

  function addBill() {
    const amt = parseFloat(billAmount)
    if (!billDesc.trim() || !billAmount || isNaN(amt) || amt <= 0) return
    const day = parseInt(billDay)
    setBills(b => [...b, {
      description: billDesc.trim(),
      amount: amt,
      day: billDay && !isNaN(day) && day >= 1 && day <= 31 ? day : null,
    }])
    setBillDesc('')
    setBillAmount('')
    setBillDay('')
    document.getElementById('bill-desc')?.focus()
  }

  function removeBill(i) {
    setBills(b => b.filter((_, idx) => idx !== i))
  }

  async function finish() {
    setSaving(true)
    try {
      const parsedIncome = parseFloat(income)
      const monthlyIncome = income && !isNaN(parsedIncome) && parsedIncome > 0 ? parsedIncome : null

      await supabase.from('user_settings').upsert({
        user_id: user.id,
        setup_complete: true,
        monthly_income: monthlyIncome,
        updated_at: new Date().toISOString(),
      })

      if (bills.length > 0) {
        const today = new Date()
        const year = today.getFullYear()
        const month = today.getMonth() + 1
        const inserts = bills.map(b => {
          const maxDay = new Date(year, month, 0).getDate()
          const d = b.day ? Math.min(b.day, maxDay) : 1
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          return {
            user_id: user.id,
            description: b.description,
            amount: -b.amount,
            category: 'bills',
            date: dateStr,
            recurring: true,
            recurring_interval: 'monthly',
          }
        })
        try {
          await supabase.from('transactions').insert(inserts)
        } catch {
          await supabase.from('transactions').insert(
            inserts.map(({ recurring, recurring_interval, ...rest }) => rest)
          )
        }
      }

      onComplete()
    } catch {
      setSaving(false)
    }
  }

  const totalBills = bills.reduce((s, b) => s + b.amount, 0)
  const parsedIncome = parseFloat(income)
  const incomeSet = income && !isNaN(parsedIncome) && parsedIncome > 0

  const ordinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 max-w-md mx-auto">

      {/* Step indicators */}
      <div className="flex gap-1.5 pt-safe">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`h-0.5 flex-1 transition-colors ${step >= s ? 'bg-black' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center py-12">

        {step === 1 && (
          <div>
            <p className="text-4xl font-thin text-black mb-3">Hi, {name}.</p>
            <p className="text-4xl font-thin text-black mb-8">Let's get you set up.</p>
            <p className="text-sm text-gray-400 leading-relaxed">
              We'll ask a couple of quick questions so Allowance can show you exactly how much you have to work with each month.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-2xl font-thin text-black mb-2">Monthly income</p>
            <p className="text-sm text-gray-400 mb-8">
              Your regular take-home pay, after tax. This helps us calculate what's available to spend.
            </p>
            <div className="flex items-baseline gap-1 border-b border-gray-200 pb-2 mb-3">
              <span className="text-2xl text-gray-400 font-thin">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={income}
                onChange={e => setIncome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setStep(3)}
                className="flex-1 text-4xl font-thin outline-none text-black placeholder-gray-200"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-300">Leave blank to skip. You can update this anytime in Profile.</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-2xl font-thin text-black mb-2">Fixed bills</p>
            <p className="text-sm text-gray-400 mb-6">
              Rent, subscriptions, loan payments. Anything that comes out every month.
            </p>

            {/* Add bill inputs */}
            <div className="space-y-2 mb-4">
              <input
                id="bill-desc"
                type="text"
                placeholder="Description"
                value={billDesc}
                onChange={e => setBillDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('bill-amount')?.focus()}
                className="w-full text-sm outline-none border-b border-gray-200 pb-1.5 placeholder-gray-300"
              />
              <div className="flex gap-3">
                <div className="flex items-baseline gap-0.5 border-b border-gray-200 pb-1.5 flex-1">
                  <span className="text-sm text-gray-400">$</span>
                  <input
                    id="bill-amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={billAmount}
                    onChange={e => setBillAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && document.getElementById('bill-day')?.focus()}
                    className="w-full text-sm outline-none text-black placeholder-gray-300"
                  />
                </div>
                <div className="flex items-baseline gap-0.5 border-b border-gray-200 pb-1.5 w-28">
                  <span className="text-sm text-gray-400">Day</span>
                  <input
                    id="bill-day"
                    type="number"
                    inputMode="numeric"
                    placeholder="1-31"
                    min="1"
                    max="31"
                    value={billDay}
                    onChange={e => setBillDay(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addBill()}
                    className="w-full text-sm outline-none text-black placeholder-gray-300 ml-1.5"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={addBill}
              className="w-full border border-gray-200 text-black text-sm font-medium py-3 mb-5 hover:bg-black hover:text-white transition-colors"
            >
              Add bill
            </button>

            {/* Bill list */}
            <div className="space-y-0 max-h-48 overflow-y-auto">
              {bills.map((b, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-100">
                  <div>
                    <p className="text-sm text-black">{b.description}</p>
                    {b.day && <p className="text-xs text-gray-400">{ordinal(b.day)} of each month</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-gray-500">-${b.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                    <button onClick={() => removeBill(i)}>
                      <X size={12} className="text-gray-300" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {bills.length > 0 && (
              <div className="flex justify-between items-center mt-3 pt-2">
                <p className="text-xs text-gray-400">Total bills</p>
                <p className="text-sm font-medium text-black">
                  -${totalBills.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {incomeSet && bills.length > 0 && (
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-400">Remaining after bills</p>
                <p className={`text-sm font-medium ${parsedIncome - totalBills < 0 ? 'text-red-800' : 'text-black'}`}>
                  ${Math.max(0, parsedIncome - totalBills).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Navigation */}
      <div className="pb-safe">
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full bg-black text-white text-sm font-medium py-4 flex items-center justify-center gap-2"
          >
            {step === 1 ? 'Get started' : 'Next'}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="w-full bg-black text-white text-sm font-medium py-4 disabled:opacity-50"
          >
            {saving ? 'Setting up...' : bills.length > 0 ? 'Save and start' : "I'm ready"}
          </button>
        )}
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="w-full text-center text-sm text-gray-400 mt-3 py-2"
          >
            Back
          </button>
        )}
        {(step === 2 || step === 3) && (
          <button
            onClick={() => step === 2 ? setStep(3) : finish()}
            disabled={saving}
            className="w-full text-center text-xs text-gray-300 mt-1 py-1 disabled:opacity-50"
          >
            Skip
          </button>
        )}
      </div>

    </div>
  )
}

export default Onboarding
