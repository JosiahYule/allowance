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
        // supabase-js resolves with { error } rather than throwing, so check
        // the returned error and retry without the recurring columns if the
        // migration that adds them hasn't been run yet.
        const { error: billsError } = await supabase.from('transactions').insert(inserts)
        if (billsError && (billsError.code === '42703' || billsError.message?.includes('column'))) {
          await supabase.from('transactions').insert(
            // eslint-disable-next-line no-unused-vars
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
    <div className="min-h-screen bg-paper flex flex-col justify-between px-6 max-w-md mx-auto">

      {/* Step indicators */}
      <div className="flex gap-1.5 pt-safe mt-6">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${step >= s ? 'bg-ink' : 'bg-line'}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center py-12">

        {step === 1 && (
          <div>
            <p className="font-display font-light text-5xl text-ink mb-3 tracking-tight">Hi, {name}.</p>
            <p className="font-display font-light text-5xl text-ink mb-8 tracking-tight">Let's set you up.</p>
            <p className="text-[15px] text-muted leading-relaxed">
              A couple of quick questions, and Allowance will show you exactly how much you have to work with each month.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-2xl font-semibold text-ink mb-2 tracking-tight">Monthly income</p>
            <p className="text-[15px] text-muted mb-9 leading-relaxed">
              Your regular take-home pay, after tax. This is what we measure your spending against.
            </p>
            <div className="flex items-baseline gap-2 border-b border-line pb-3 mb-3">
              <span className="font-display font-light text-3xl text-faint">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={income}
                onChange={e => setIncome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setStep(3)}
                className="flex-1 font-display font-light text-5xl outline-none text-ink placeholder-faint tabular-nums bg-transparent"
                autoFocus
              />
            </div>
            <p className="text-[13px] text-faint">Leave blank to skip. You can change this anytime.</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-2xl font-semibold text-ink mb-2 tracking-tight">Fixed bills</p>
            <p className="text-[15px] text-muted mb-6 leading-relaxed">
              Rent, subscriptions, loan payments — anything that recurs every month.
            </p>

            {/* Add bill inputs */}
            <div className="space-y-3 mb-4">
              <input
                id="bill-desc"
                type="text"
                placeholder="Description"
                value={billDesc}
                onChange={e => setBillDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('bill-amount')?.focus()}
                className="w-full text-[15px] outline-none border-b border-line pb-2 placeholder-faint bg-transparent focus:border-ink transition-colors"
              />
              <div className="flex gap-3">
                <div className="flex items-baseline gap-1 border-b border-line pb-2 flex-1">
                  <span className="text-[15px] text-muted">$</span>
                  <input
                    id="bill-amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={billAmount}
                    onChange={e => setBillAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && document.getElementById('bill-day')?.focus()}
                    className="w-full text-[15px] outline-none text-ink placeholder-faint tabular-nums bg-transparent"
                  />
                </div>
                <div className="flex items-baseline gap-1.5 border-b border-line pb-2 w-28">
                  <span className="text-[15px] text-muted">Day</span>
                  <input
                    id="bill-day"
                    type="number"
                    inputMode="numeric"
                    placeholder="1–31"
                    min="1"
                    max="31"
                    value={billDay}
                    onChange={e => setBillDay(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addBill()}
                    className="w-full text-[15px] outline-none text-ink placeholder-faint tabular-nums bg-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={addBill}
              className="w-full bg-fill text-ink text-[14px] font-medium py-3 rounded-full mb-5 active:scale-[0.98] transition-transform"
            >
              Add bill
            </button>

            {/* Bill list */}
            <div className="space-y-0 max-h-44 overflow-y-auto">
              {bills.map((b, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-line last:border-0">
                  <div>
                    <p className="text-[15px] text-ink">{b.description}</p>
                    {b.day && <p className="text-[12px] text-muted">{ordinal(b.day)} of each month</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[15px] text-ink-soft tabular-nums">−${b.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
                    <button onClick={() => removeBill(i)}>
                      <X size={14} className="text-faint" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {bills.length > 0 && (
              <div className="flex justify-between items-center mt-4 pt-2">
                <p className="text-[13px] text-muted">Total bills</p>
                <p className="text-[15px] font-medium text-ink tabular-nums">
                  −${totalBills.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {incomeSet && bills.length > 0 && (
              <div className="flex justify-between items-center mt-1.5">
                <p className="text-[13px] text-muted">Remaining after bills</p>
                <p className={`text-[15px] font-semibold tabular-nums ${parsedIncome - totalBills < 0 ? 'text-danger' : 'text-accent'}`}>
                  ${Math.max(0, parsedIncome - totalBills).toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Navigation */}
      <div className="pb-safe mb-6">
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="btn-primary w-full text-sm py-4 flex items-center justify-center gap-2"
          >
            {step === 1 ? 'Get started' : 'Next'}
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="btn-primary w-full text-sm py-4"
          >
            {saving ? 'Setting up…' : bills.length > 0 ? 'Save and start' : "I'm ready"}
          </button>
        )}
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="w-full text-center text-[13px] text-muted mt-3 py-2"
          >
            Back
          </button>
        )}
        {(step === 2 || step === 3) && (
          <button
            onClick={() => step === 2 ? setStep(3) : finish()}
            disabled={saving}
            className="w-full text-center text-[12px] text-faint mt-1 py-1 disabled:opacity-50"
          >
            Skip
          </button>
        )}
      </div>

    </div>
  )
}

export default Onboarding
