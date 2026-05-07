'use client'

import { useState } from 'react'
import { Copy, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'

type Mode = 'dates' | 'recurrence'
type Rule = 'weekly' | 'weekdays' | 'daily'

interface Props {
  workoutId: number
  workoutTitle: string
  trigger?: React.ReactNode
  onDone?: () => void
  defaultDate?: string
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DuplicateWorkoutDialog({ workoutId, workoutTitle, trigger, onDone, defaultDate }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>('dates')

  const [titleSuffix, setTitleSuffix] = useState(' (copy)')
  const [dates, setDates] = useState<string[]>(defaultDate ? [defaultDate] : [])
  const [newDate, setNewDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'))

  const [rule, setRule] = useState<Rule>('weekly')
  const [count, setCount] = useState(4)
  const [startDate, setStartDate] = useState(defaultDate || format(new Date(), 'yyyy-MM-dd'))
  const [weekdays, setWeekdays] = useState<number[]>([new Date().getDay()])

  function addDate() {
    if (!newDate) return
    if (!dates.includes(newDate)) {
      setDates([...dates, newDate].sort())
    }
    // bump newDate to next day for fast multi-add
    setNewDate(format(addDays(new Date(newDate + 'T00:00:00'), 1), 'yyyy-MM-dd'))
  }

  function removeDate(d: string) {
    setDates(dates.filter((x) => x !== d))
  }

  function toggleWeekday(n: number) {
    setWeekdays(weekdays.includes(n) ? weekdays.filter((d) => d !== n) : [...weekdays, n].sort())
  }

  async function submit() {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { title_suffix: titleSuffix }
      if (mode === 'dates') {
        if (dates.length === 0) {
          toast.error('Pick at least one date (or just create the copy without scheduling).')
        }
        body.scheduled_dates = dates
      } else {
        body.recurrence = {
          rule,
          count,
          start_date: startDate,
          weekdays: rule === 'weekly' ? weekdays : undefined,
        }
      }

      const res = await fetch(`/api/workouts/${workoutId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      toast.success(
        data.scheduled_count > 0
          ? `Duplicated and scheduled ${data.scheduled_count} day${data.scheduled_count === 1 ? '' : 's'}`
          : `Duplicated as "${data.title}"`
      )
      setOpen(false)
      onDone?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
          <Copy className="h-4 w-4" />
          Duplicate
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-russo)]">
              <Copy className="h-5 w-5" />
              Duplicate &ldquo;{workoutTitle}&rdquo;
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label>New workout title suffix</Label>
              <Input
                value={titleSuffix}
                onChange={(e) => setTitleSuffix(e.target.value)}
                placeholder=" (copy)"
              />
              <p className="text-xs text-muted-foreground mt-1">New workout: <strong>{workoutTitle}{titleSuffix}</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['dates', 'recurrence'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`border-2 rounded-md px-3 py-2 text-sm font-semibold ${
                    mode === m
                      ? 'border-black bg-black text-white shadow-[2px_2px_0px_0px_#0A0A0A]'
                      : 'border-input bg-background hover:border-black'
                  }`}
                >
                  {m === 'dates' ? 'Pick dates' : 'Recurring'}
                </button>
              ))}
            </div>

            {mode === 'dates' && (
              <div className="space-y-2">
                <Label>Schedule on dates</Label>
                <div className="flex gap-2">
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  <Button type="button" onClick={addDate} variant="outline">Add</Button>
                </div>
                {dates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dates.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1 bg-white border-2 border-black rounded-md px-2 py-1 text-xs">
                        {d}
                        <button type="button" onClick={() => removeDate(d)} className="hover:text-red-600">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Leave empty to create the copy without scheduling it.
                </p>
              </div>
            )}

            {mode === 'recurrence' && (
              <div className="space-y-3">
                <div>
                  <Label>Pattern</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['weekly', 'weekdays', 'daily'] as Rule[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRule(r)}
                        className={`border-2 rounded-md px-2 py-1.5 text-xs font-semibold capitalize ${
                          rule === r
                            ? 'border-black bg-black text-white'
                            : 'border-input bg-background hover:border-black'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {rule === 'weekly' && (
                  <div>
                    <Label>Days of the week</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAY_LABELS.map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleWeekday(i)}
                          className={`border-2 rounded px-1 py-1.5 text-[11px] font-semibold ${
                            weekdays.includes(i)
                              ? 'border-black bg-black text-white'
                              : 'border-input bg-background'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>How many?</Label>
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button onClick={submit} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              {loading ? 'Duplicating...' : 'Duplicate workout'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
