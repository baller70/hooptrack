'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, addDays, addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, isToday, parseISO,
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, Dumbbell, PlayCircle, GraduationCap, MessageSquareQuote,
  Flame, Trash2, Check, Calendar as CalendarIcon, Layers, Plus, X, Loader2, Sparkles, Search, Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import AIInspiration from '@/components/ai-inspiration'
import DuplicateWorkoutDialog from '@/components/duplicate-workout-dialog'

type ViewMode = 'day' | 'week' | 'month'
type ItemType = 'workout' | 'move' | 'quiz' | 'quote'

interface ScheduleItem {
  id: number
  player_id: number
  workout_id: number | null
  workout_title: string | null
  workout_category: string | null
  scheduled_date: string
  completed: number
  completed_at: string | null
  player_name: string
  item_type: string
  item_id: number | null
  title: string | null
  notes: string | null
}

interface Player { id: number; name: string }
interface Workout { id: number; title: string; category: string }
interface Move { id: number; title: string; category: string }
interface Quiz { id: number; title: string; type: string }

const ITEM_COLORS: Record<string, string> = {
  workout: 'bg-orange-100 border-orange-300 text-orange-800',
  move: 'bg-blue-100 border-blue-300 text-blue-800',
  quiz: 'bg-purple-100 border-purple-300 text-purple-800',
  quote: 'bg-green-100 border-green-300 text-green-800',
}

const ITEM_ICONS: Record<string, typeof Dumbbell> = {
  workout: Dumbbell,
  move: PlayCircle,
  quiz: GraduationCap,
  quote: MessageSquareQuote,
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [userRole, setUserRole] = useState('')
  const [userId, setUserId] = useState<number | null>(null)

  // Sidebar data
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [moves, setMoves] = useState<Move[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])

  // Drag state
  const [dragging, setDragging] = useState<{ type: ItemType; id?: number; title: string } | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  // Expanded day panel
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkItems, setBulkItems] = useState<{ type: ItemType; id?: number; title: string }[]>([])
  const [bulkDates, setBulkDates] = useState<Set<string>>(new Set())

  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState<ItemType>('workout')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [quoteText, setQuoteText] = useState('')

  // Loading
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.json()).then(d => {
      if (d?.user) {
        setUserRole(d.user.role)
        setUserId(d.user.id)
        if (d.user.role === 'player') setSelectedPlayerId(d.user.id)
      }
    })
    fetch('/api/players').then(r => r.json()).then(d => {
      setPlayers(d.players || [])
      // Auto-select first player if trainer hasn't selected one
      if (d.players?.length > 0 && !selectedPlayerId) {
        setSelectedPlayerId(d.players[0].id)
      }
    })
    fetch('/api/workouts').then(r => r.json()).then(d => setWorkouts(d.workouts || []))
    fetch('/api/moves').then(r => r.json()).then(d => setMoves(d.moves || []))
    fetch('/api/quizzes').then(r => r.json()).then(d => setQuizzes(d.quizzes || []))
  }, [])

  const fetchSchedule = useCallback(() => {
    let param = ''
    if (view === 'day') param = `day=${format(currentDate, 'yyyy-MM-dd')}`
    else if (view === 'week') param = `week=${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`
    else param = `month=${format(currentDate, 'yyyy-MM')}`

    if (selectedPlayerId) param += `&playerId=${selectedPlayerId}`

    fetch(`/api/schedule?${param}`)
      .then(r => r.json())
      .then(d => setSchedule(d.schedule || []))
  }, [view, currentDate, selectedPlayerId])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  function navigate(dir: -1 | 1) {
    if (view === 'day') setCurrentDate(d => addDays(d, dir))
    else if (view === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
  }

  function getItemsForDate(date: Date): ScheduleItem[] {
    const dateStr = format(date, 'yyyy-MM-dd')
    return schedule.filter(s => s.scheduled_date === dateStr)
  }

  function getDisplayTitle(item: ScheduleItem): string {
    if (item.title) return item.title
    if (item.workout_title) return item.workout_title
    return item.item_type
  }

  // Drop handler — accepts optional item override for click-to-add
  async function handleDrop(dateStr: string, itemOverride?: { type: ItemType; id?: number; title: string }) {
    const item = itemOverride || dragging
    if (!item) return
    const targetPlayerId = selectedPlayerId || userId
    if (!targetPlayerId) {
      toast.error('Select a player first')
      return
    }
    setDragOverDate(null)

    const body: Record<string, unknown> = {
      player_id: targetPlayerId,
      scheduled_date: dateStr,
      item_type: item.type,
      title: item.title,
    }
    if (item.id) {
      body.item_id = item.id
      if (item.type === 'workout') body.workout_id = item.id
    }
    if (item.type === 'quote') body.notes = item.title

    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      toast.success(`Added to ${dateStr}`)
      fetchSchedule()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Failed to add')
    }
    setDragging(null)
  }

  async function markComplete(id: number) {
    await fetch(`/api/schedule/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    })
    fetchSchedule()
  }

  async function deleteItem(id: number) {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' })
    fetchSchedule()
  }

  // Bulk assign
  function toggleBulkDate(dateStr: string) {
    setBulkDates(prev => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  function addToBulkItems(type: ItemType, id?: number, title?: string) {
    setBulkItems(prev => [...prev, { type, id, title: title || type }])
  }

  async function executeBulk() {
    if (!selectedPlayerId) { toast.error('Select a player'); return }
    if (bulkItems.length === 0) { toast.error('Add items to assign'); return }
    if (bulkDates.size === 0) { toast.error('Select dates'); return }

    setLoading(true)
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulk: true,
        player_id: selectedPlayerId,
        items: bulkItems.map(i => ({
          item_type: i.type,
          item_id: i.id,
          title: i.title,
          notes: i.type === 'quote' ? i.title : undefined,
        })),
        dates: Array.from(bulkDates).sort(),
      }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      toast.success(`Assigned ${data.count} items!`)
      setBulkMode(false)
      setBulkItems([])
      setBulkDates(new Set())
      fetchSchedule()
    } else {
      toast.error('Bulk assign failed')
    }
  }

  // Get days array for current view
  function getViewDays(): Date[] {
    if (view === 'day') return [currentDate]
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end: addDays(start, 6) })
    }
    return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  }

  const days = getViewDays()
  const streak = schedule.filter(s => s.completed).length

  // Render a single schedule item chip
  function ItemChip({ item }: { item: ScheduleItem }) {
    const Icon = ITEM_ICONS[item.item_type] || Dumbbell
    const colors = ITEM_COLORS[item.item_type] || ITEM_COLORS.workout
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${colors} ${item.completed ? 'opacity-50 line-through' : ''}`}>
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{getDisplayTitle(item)}</span>
        {userRole === 'trainer' && (
          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            {!item.completed && (
              <button onClick={(e) => { e.stopPropagation(); markComplete(item.id) }} className="hover:opacity-70">
                <Check className="h-3 w-3" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id) }} className="hover:opacity-70 text-red-600">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Render a day cell
  function DayCell({ date, compact }: { date: Date; compact?: boolean }) {
    const dateStr = format(date, 'yyyy-MM-dd')
    const items = getItemsForDate(date)
    const isOver = dragOverDate === dateStr
    const isBulkSelected = bulkDates.has(dateStr)

    return (
      <div
        className={`
          border rounded-lg p-1.5 min-h-[80px] transition-colors
          ${isToday(date) ? 'ring-2 ring-hoop-orange' : ''}
          ${isOver ? 'bg-orange-50 border-hoop-orange' : 'border-gray-200'}
          ${isBulkSelected ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400' : ''}
          cursor-pointer
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateStr) }}
        onDragLeave={() => setDragOverDate(null)}
        onDrop={(e) => { e.preventDefault(); handleDrop(dateStr) }}
        onClick={bulkMode ? () => toggleBulkDate(dateStr) : () => setExpandedDate(date)}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${isToday(date) ? 'text-hoop-orange' : 'text-muted-foreground'}`}>
            {compact ? format(date, 'd') : format(date, 'EEE d')}
          </span>
          {items.length > 0 && <span className="text-[10px] text-muted-foreground">{items.length}</span>}
        </div>
        <div className="space-y-1">
          {items.slice(0, compact ? 2 : 10).map(item => (
            <ItemChip key={item.id} item={item} />
          ))}
          {compact && items.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{items.length - 2} more</span>
          )}
        </div>
      </div>
    )
  }

  // Quick-add: click sidebar item to add to expanded day
  async function quickAdd(type: ItemType, id?: number, title?: string) {
    if (!expandedDate) {
      toast.error('Click a day on the calendar first')
      return
    }
    const targetPlayerId = selectedPlayerId || userId
    if (!targetPlayerId) {
      toast.error('Select a player first')
      return
    }
    const dateStr = format(expandedDate, 'yyyy-MM-dd')
    const body: Record<string, unknown> = {
      player_id: targetPlayerId,
      scheduled_date: dateStr,
      item_type: type,
      title: title || type,
    }
    if (id) {
      body.item_id = id
      if (type === 'workout') body.workout_id = id
    }
    if (type === 'quote') body.notes = title

    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(`Added to ${dateStr}`)
        fetchSchedule()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to add')
      }
    } catch {
      toast.error('Failed to add')
    }
  }

  // Sidebar draggable item
  function DraggableItem({ type, id, title }: { type: ItemType; id?: number; title: string }) {
    const Icon = ITEM_ICONS[type]
    const colors = ITEM_COLORS[type]
    return (
      <div
        draggable
        onDragStart={() => setDragging({ type, id, title })}
        onDragEnd={() => setDragging(null)}
        onClick={() => {
          if (bulkMode) { addToBulkItems(type, id, title); return }
          quickAdd(type, id, title)
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer hover:opacity-80 transition-opacity ${colors} ${expandedDate ? 'ring-1 ring-offset-1 ring-hoop-orange/30' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{title}</span>
        {expandedDate && !bulkMode && <Plus className="h-3 w-3 ml-auto shrink-0 opacity-50" />}
        {bulkMode && (
          <button
            onClick={(e) => { e.stopPropagation(); addToBulkItems(type, id, title) }}
            className="ml-auto shrink-0"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* AI Inspiration — trainer only */}
      {userRole === 'trainer' && (
        <div className="mb-4">
          <AIInspiration />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-[family-name:var(--font-russo)] text-2xl">Accountability Calendar</h2>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-hoop-orange text-sm font-semibold mt-0.5">
              <Flame className="h-4 w-4" />
              {streak} completed
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter by player (trainer-only) — for viewing a specific player's schedule */}
          {userRole === 'trainer' && (
            <select
              value={selectedPlayerId || ''}
              onChange={(e) => setSelectedPlayerId(e.target.value ? parseInt(e.target.value) : null)}
              className="h-9 rounded-md border-2 border-input bg-background px-3 text-sm"
              title="Filter calendar by player"
            >
              <option value="">Filter: All Players</option>
              {players.map(p => <option key={p.id} value={p.id}>Filter: {p.name}</option>)}
            </select>
          )}

          {/* View toggles */}
          <div className="flex border-2 border-black rounded-lg overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold capitalize ${view === v ? 'bg-hoop-black text-white' : 'bg-white hover:bg-gray-50'}`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Bulk mode toggle */}
          {userRole === 'trainer' && (
            <Button
              size="sm"
              variant={bulkMode ? 'default' : 'outline'}
              onClick={() => { setBulkMode(!bulkMode); setBulkItems([]); setBulkDates(new Set()) }}
              className="gap-1"
            >
              <Layers className="h-3 w-3" />
              Bulk
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-[family-name:var(--font-russo)] text-lg">
          {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
          {view === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`}
          {view === 'month' && format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-1">
          {view === 'day' && (
            <div>
              <DayCell date={currentDate} />
            </div>
          )}

          {view === 'week' && (
            <div className="grid grid-cols-7 gap-2">
              {days.map(d => (
                <DayCell key={d.toISOString()} date={d} />
              ))}
            </div>
          )}

          {view === 'month' && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {/* Offset for first day */}
                {Array.from({ length: (startOfMonth(currentDate).getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[80px]" />
                ))}
                {days.map(d => (
                  <DayCell key={d.toISOString()} date={d} compact />
                ))}
              </div>
            </div>
          )}

          {/* Expanded Day Panel */}
          {expandedDate && (
            <div className="mt-4 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#0A0A0A] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b-2 border-gray-100">
                <h3 className="font-[family-name:var(--font-russo)] text-lg">
                  {format(expandedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
                <button onClick={() => setExpandedDate(null)} className="p-1 hover:opacity-70">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div
                className={`p-4 min-h-[200px] ${dragOverDate === format(expandedDate, 'yyyy-MM-dd') ? 'bg-orange-50' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverDate(format(expandedDate, 'yyyy-MM-dd')) }}
                onDragLeave={() => setDragOverDate(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(format(expandedDate, 'yyyy-MM-dd')) }}
              >
                {getItemsForDate(expandedDate).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nothing scheduled for this day.</p>
                    <p className="text-xs mt-1">Click any item in the sidebar to add it here, or drag it over.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getItemsForDate(expandedDate).map(item => {
                      const Icon = ITEM_ICONS[item.item_type] || Dumbbell
                      const colors = ITEM_COLORS[item.item_type] || ITEM_COLORS.workout
                      return (
                        <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${colors} ${item.completed ? 'opacity-50' : ''}`}>
                          <Icon className="h-5 w-5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${item.completed ? 'line-through' : ''}`}>
                              {getDisplayTitle(item)}
                            </p>
                            {item.notes && <p className="text-xs mt-0.5 opacity-80 italic">{item.notes}</p>}
                            {item.workout_category && <span className="text-xs opacity-70">{item.workout_category}</span>}
                            <span className="text-xs ml-2 capitalize opacity-60">{item.item_type}</span>
                          </div>
                          {userRole === 'trainer' && (
                            <div className="flex items-center gap-1 shrink-0">
                              {!item.completed && (
                                <button onClick={() => markComplete(item.id)} className="p-1.5 rounded-md hover:bg-white/50" title="Mark complete">
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              {item.completed && (
                                <Badge variant="secondary" className="text-[10px]">Done</Badge>
                              )}
                              {item.item_type === 'workout' && item.workout_id && (
                                <DuplicateWorkoutDialog
                                  workoutId={item.workout_id}
                                  workoutTitle={item.workout_title || getDisplayTitle(item)}
                                  defaultDate={item.scheduled_date}
                                  onDone={fetchSchedule}
                                  trigger={
                                    <button className="p-1.5 rounded-md hover:bg-white/50" title="Duplicate workout">
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  }
                                />
                              )}
                              <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-md hover:bg-white/50 text-red-600" title="Remove">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Drop zone hint when dragging */}
                {dragging && (
                  <div className="mt-3 border-2 border-dashed border-hoop-orange rounded-lg p-3 text-center text-sm text-hoop-orange">
                    Drop &ldquo;{dragging.title}&rdquo; here
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — tabbed, searchable, scalable */}
        {userRole === 'trainer' && (
          <div className="w-72 shrink-0 hidden lg:block">
            <div className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] sticky top-4 max-h-[calc(100vh-120px)] flex flex-col overflow-hidden">

              {/* Bulk queue (always visible when active) */}
              {bulkMode && bulkItems.length > 0 && (
                <div className="p-3 bg-purple-50 border-b border-purple-200">
                  <p className="text-xs font-semibold text-purple-700 mb-1">Bulk Queue ({bulkItems.length})</p>
                  <div className="max-h-20 overflow-y-auto space-y-0.5">
                    {bulkItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-0.5">
                        <span className="truncate">{item.title}</span>
                        <button onClick={() => setBulkItems(prev => prev.filter((_, j) => j !== i))}>
                          <X className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">{bulkDates.size} dates selected</p>
                  <Button size="sm" className="w-full mt-2 bg-purple-600 hover:bg-purple-700" onClick={executeBulk} disabled={loading || bulkDates.size === 0}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Layers className="h-3 w-3 mr-1" />}
                    Assign to {bulkDates.size} days
                  </Button>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b">
                {([
                  { type: 'workout' as ItemType, icon: Dumbbell, label: 'Workouts', count: workouts.length },
                  { type: 'move' as ItemType, icon: PlayCircle, label: 'Moves', count: moves.length },
                  { type: 'quiz' as ItemType, icon: GraduationCap, label: 'Quizzes', count: quizzes.length },
                  { type: 'quote' as ItemType, icon: MessageSquareQuote, label: 'Quotes', count: 0 },
                ]).map(tab => (
                  <button
                    key={tab.type}
                    onClick={() => { setSidebarTab(tab.type); setSidebarSearch('') }}
                    className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors border-b-2 ${
                      sidebarTab === tab.type
                        ? 'border-hoop-orange text-hoop-orange'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && <span className="text-[9px] opacity-60">{tab.count}</span>}
                  </button>
                ))}
              </div>

              {/* Search (for workouts/moves/quizzes) */}
              {sidebarTab !== 'quote' && (
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      placeholder={`Search ${sidebarTab}s...`}
                      className="w-full h-8 rounded-md border border-input bg-background pl-7 pr-2 text-xs"
                    />
                    {sidebarSearch && (
                      <button onClick={() => setSidebarSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Scrollable item list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sidebarTab === 'workout' && (() => {
                  const filtered = workouts.filter(w => !sidebarSearch || w.title.toLowerCase().includes(sidebarSearch.toLowerCase()) || w.category.toLowerCase().includes(sidebarSearch.toLowerCase()))
                  // Group by category
                  const groups: Record<string, Workout[]> = {}
                  for (const w of filtered) {
                    if (!groups[w.category]) groups[w.category] = []
                    groups[w.category].push(w)
                  }
                  return Object.keys(groups).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">{sidebarSearch ? 'No matches' : 'No workouts yet'}</p>
                  ) : (
                    Object.entries(groups).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1">{cat}</p>
                        {items.map(w => <DraggableItem key={w.id} type="workout" id={w.id} title={w.title} />)}
                      </div>
                    ))
                  )
                })()}

                {sidebarTab === 'move' && (() => {
                  const filtered = moves.filter((m: Move) => !sidebarSearch || m.title.toLowerCase().includes(sidebarSearch.toLowerCase()) || m.category.toLowerCase().includes(sidebarSearch.toLowerCase()))
                  const groups: Record<string, Move[]> = {}
                  for (const m of filtered) {
                    if (!groups[m.category]) groups[m.category] = []
                    groups[m.category].push(m)
                  }
                  return Object.keys(groups).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">{sidebarSearch ? 'No matches' : 'No moves yet'}</p>
                  ) : (
                    Object.entries(groups).map(([cat, items]) => (
                      <div key={cat}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1">{cat}</p>
                        {items.map((m: Move) => <DraggableItem key={m.id} type="move" id={m.id} title={m.title} />)}
                      </div>
                    ))
                  )
                })()}

                {sidebarTab === 'quiz' && (() => {
                  const filtered = quizzes.filter((q: Quiz) => !sidebarSearch || q.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
                  return filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">{sidebarSearch ? 'No matches' : 'No quizzes yet'}</p>
                  ) : (
                    filtered.map((q: Quiz) => <DraggableItem key={q.id} type="quiz" id={q.id} title={q.title} />)
                  )
                })()}

                {sidebarTab === 'quote' && (
                  <div className="space-y-2 p-1">
                    <input
                      value={quoteText}
                      onChange={(e) => setQuoteText(e.target.value)}
                      placeholder="Type a motivational quote..."
                      className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                    />
                    {quoteText && <DraggableItem type="quote" title={quoteText} />}
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/ai/inspiration', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ playerName: selectedPlayerId ? players.find(p => p.id === selectedPlayerId)?.name : 'player' }),
                        })
                        if (res.ok) {
                          const data = await res.json()
                          setQuoteText(data.message)
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900 font-medium w-full justify-center py-2 border border-purple-200 rounded-lg hover:bg-purple-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      Generate AI Quote
                    </button>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="p-2 border-t bg-gray-50 text-center">
                <p className="text-[10px] text-muted-foreground">
                  {bulkMode ? 'Click + then select dates on calendar' : 'Drag items onto a day'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Bottom sheet for adding items (since sidebar is hidden on mobile) */}
      {userRole === 'trainer' && (
        <div className="lg:hidden mt-4">
          <details className="bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_#0A0A0A] overflow-hidden">
            <summary className="p-4 font-semibold cursor-pointer flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add items to calendar
            </summary>
            <div className="p-4 border-t space-y-3 max-h-[50vh] overflow-y-auto">
              <input
                placeholder="Search workouts, moves, quizzes..."
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm mb-2"
                onChange={(e) => setSidebarSearch(e.target.value)}
              />

              <p className="text-xs font-semibold flex items-center gap-1"><Dumbbell className="h-3 w-3" /> Workouts ({workouts.length})</p>
              {workouts.filter(w => !sidebarSearch || w.title.toLowerCase().includes(sidebarSearch.toLowerCase())).slice(0, 10).map(w => <DraggableItem key={w.id} type="workout" id={w.id} title={w.title} />)}
              {workouts.length > 10 && !sidebarSearch && <p className="text-[10px] text-muted-foreground">Search to find more...</p>}

              <p className="text-xs font-semibold flex items-center gap-1"><PlayCircle className="h-3 w-3" /> Moves ({moves.length})</p>
              {moves.filter((m: Move) => !sidebarSearch || m.title.toLowerCase().includes(sidebarSearch.toLowerCase())).slice(0, 10).map((m: Move) => <DraggableItem key={m.id} type="move" id={m.id} title={m.title} />)}

              <p className="text-xs font-semibold flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Quizzes ({quizzes.length})</p>
              {quizzes.map((q: Quiz) => <DraggableItem key={q.id} type="quiz" id={q.id} title={q.title} />)}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
