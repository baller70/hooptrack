'use client'

import {
  BarChart, Bar, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts'

/* Charts for design/hooptrack-raw-individual-screens/ios/
 * 011-player-progress-report-raw.png — screen-pack tokens, not the old
 * neobrutalist black strokes. Values are sampled from app/globals.css. */

const ORANGE = '#FE4800'
const INK = '#0A0A0A'
const MUTED = '#6B6B70'
const LINE = '#E0E1E4'
const LINE_SOFT = '#EDEDF0'

const TOOLTIP = {
  border: `1px solid ${LINE}`,
  borderRadius: 12,
  fontSize: 13,
  boxShadow: '0 4px 16px rgba(10,10,10,0.08)',
}

const AXIS = { fontSize: 12, fill: MUTED }

interface SubjectHour { subject: string; hours: number }
interface WeeklyHour { week: string; hours: number }
interface RadarPoint { subject: string; score: number; fullMark: number }

export function HoursByCategoryChart({ data }: { data: SubjectHour[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 34 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE_SOFT} vertical={false} />
        <XAxis
          dataKey="subject"
          stroke={LINE}
          tick={AXIS}
          angle={-25}
          textAnchor="end"
          interval={0}
          tickLine={false}
        />
        <YAxis stroke={LINE} tick={AXIS} tickLine={false} width={34} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: LINE_SOFT }} />
        <Bar dataKey="hours" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Training volume — bars with the value printed above each, as in the design. */
export function WeeklyHoursChart({ data }: { data: WeeklyHour[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 24, right: 10, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE_SOFT} vertical={false} />
        <XAxis dataKey="week" stroke={LINE} tick={AXIS} tickLine={false} interval={0} />
        <YAxis stroke={LINE} tick={AXIS} tickLine={false} width={34} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: LINE_SOFT }} />
        <Bar dataKey="hours" fill={ORANGE} radius={[4, 4, 0, 0]} maxBarSize={26}>
          <LabelList
            dataKey="hours"
            position="top"
            offset={8}
            style={{ fill: INK, fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface DailyHour {
  date: string
  weekday: string
  label: string
  hours: number
}

/**
 * Training volume: one bar per day with the value printed above it.
 * `labelKey` picks the x-axis wording — weekday names on the player report,
 * dates on the coach's "Last N Days" view.
 */
export function DailyVolumeChart({
  data,
  labelKey = 'weekday',
  height = 240,
}: {
  data: DailyHour[]
  labelKey?: 'weekday' | 'label'
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={LINE_SOFT} vertical={false} />
        <XAxis dataKey={labelKey} stroke={LINE} tick={AXIS} tickLine={false} interval={0} />
        <YAxis stroke={LINE} tick={AXIS} tickLine={false} width={30} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP} cursor={{ fill: LINE_SOFT }} />
        <Bar dataKey="hours" fill={ORANGE} radius={[3, 3, 0, 0]} maxBarSize={22}>
          <LabelList
            dataKey="hours"
            position="top"
            offset={7}
            style={{ fill: INK, fontSize: 11, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SubjectRadar({ data }: { data: RadarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
        <PolarGrid stroke={LINE} />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: MUTED }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: MUTED }} stroke={LINE} />
        <Radar dataKey="score" stroke={ORANGE} strokeWidth={2} fill={ORANGE} fillOpacity={0.28} />
        <Tooltip contentStyle={TOOLTIP} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
