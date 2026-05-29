import { useState } from 'react'
import { ChevronRight, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1) // 1=welcome, 2=income, 3=bills, 4=done
  const [income, setIncome] = useState('')
  const [bills, setBills] = useState([]) // [{ description, amount }]
  const [billDesc, setBillDesc] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const displayName = user?.email?.split('@')[0] || 'there'
  const name = displayName.charAt(0).toUpperCase() + displayName.slice(1)

  function addBill() {
    const amt = parseFloat(billAmount)
    if (!billDesc.trim() || !billAmount || isNaN(amt) || amt <= 0) return
    setBills(b => [...b, { description: billDesc.trim(), amount: amt }])
    setBillDesc('')
    setBillAmount('')
  }

  function removeBill(i) {
    setBills(b => b.filter((_, idx) => idx !== i))
  }

  async function finish() {
    setSaving(true)
    try {
      const parsedIncome = parseFloat(income)
      const monthlyIncome = income && !isNaN(parsedIncome) && parsedIncome > 0 ? parsedIncome : null

      // Upsert user settings
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        setup_complete: true,
        monthly_income: monthlyIncome,
        updated_at: new Date().toISOString(),
      })

      // Insert bills as recurring transactions dated first of current month
      if (bills.length > 0) {
        const today = new Date()
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
        const inserts = bills.map(b => ({
          user_id: user.id,
          description: b.description,
          amount: -b.amount,
          category: 'bills',
          date: dateStr,
          recurring: true,
          recurring_interval: 'monthly',
        }))
        // Try with recurring fields; fall back without if columns don't exist
        try {
          await supabase.from('transactions').insert(inserts)
        } catch {
          await supabase.from('transactions').insert(
            inserts.map(({ recurring, recurring_interval, ...rest }) => rest)
          )
        }
      }

      onComplete(monthlyIncome)
    } catch {
      setSaving(false)
    }
  }

  const totalBills = bills.reduce((s, b) => s + b.amount, 0)
  const parsedIncome = parseFloat(income)
  const incomeSet = income && !isNaN(parsedIncome) && parsedIncome > 0

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 max-w-md mx-auto">

      {/* Step indicators */}
      <div className="flex gap-1.5 pt-safe">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`h-0.5 flex-1 rounded-full transition-colors ${step > s ? 'bg-black' : step === s ? 'bg-black' : 'bg-gray-200'}`}
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
              Your regular take-home pay — after tax. This helps us calculate what's available to spend.
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
            <p className="text-xs text-gray-300">Leave blank to skip — you can always update this in Profile.</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-2xl font-thin text-black mb-2">Fixed bills</p>
            <p className="text-sm text-gray-400 mb-6">
              Rent, subscriptions, loan payments — anything that comes out every month.
            </p>

            {/* Add bill row */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Description"
                value={billDesc}
                onChange={e => setBillDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('bill-amount')?.focus()}
                className="flex-1 text-sm outline-none border-b border-gray-200 pb-1.5 placeholder-gray-300"
              />
              <div className="flex items-baseline gap-0.5 border-b border-gray-200 pb-1.5 w-24">
                <span className="text-sm text-gray-400">$</span>
                <input
                  id="bill-amount"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={billAmount}
                  onChange={e => setBillAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addBill()}
                  className="w-full text-sm outline-none text-black placeholder-gray-300"
                />
              </div>
              <button
                onClick={addBill}
                className="w-7 h-7 bg-black rounded-full flex items-center justify-center flex-shrink-0"
              >
                <Plus size={14} className="text-white" />
              </button>
            </div>

            {/* Bill list */}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {bills.map((b, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <p className="text-sm text-black">{b.description}</p>
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
            className="w-full bg-black text-white text-sm font-medium py-4 rounded-full flex items-center justify-center gap-2"
          >
            {step === 1 ? 'Get started' : 'Next'}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="w-full bg-black text-white text-sm font-medium py-4 rounded-full disabled:opacity-50"
          >
            {saving ? 'Setting up…' : bills.length > 0 ? 'Save and start' : "I'm ready"}
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
