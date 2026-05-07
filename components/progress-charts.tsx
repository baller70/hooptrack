'use client'

import {
  BarChart, Bar,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts'

interface SubjectHour { subject: string; hours: number }
interface WeeklyHour { week: string; hours: number }
interface RadarPoint { subject: string; score: number; fullMark: number }

const HOOP_BLACK = '#0A0A0A'
const HOOP_ORANGE = '#F97316'

export function HoursByCategoryChart({ data }: { data: SubjectHour[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="subject" stroke={HOOP_BLACK} fontSize={11} angle={-25} textAnchor="end" interval={0} />
        <YAxis stroke={HOOP_BLACK} fontSize={11} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 11 }} />
        <Tooltip contentStyle={{ border: '2px solid black', borderRadius: 6, fontSize: 12 }} />
        <Bar dataKey="hours" fill={HOOP_ORANGE} stroke={HOOP_BLACK} strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function WeeklyHoursChart({ data }: { data: WeeklyHour[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="week" stroke={HOOP_BLACK} fontSize={11} />
        <YAxis stroke={HOOP_BLACK} fontSize={11} label={{ value: 'Hours / week', angle: -90, position: 'insideLeft', fontSize: 11 }} />
        <Tooltip contentStyle={{ border: '2px solid black', borderRadius: 6, fontSize: 12 }} />
        <Line type="monotone" dataKey="hours" stroke={HOOP_BLACK} strokeWidth={3} dot={{ fill: HOOP_ORANGE, stroke: HOOP_BLACK, strokeWidth: 2, r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SubjectRadar({ data }: { data: RadarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
        <PolarGrid stroke="#999999" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: HOOP_BLACK }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#999999" />
        <Radar dataKey="score" stroke={HOOP_BLACK} strokeWidth={2} fill={HOOP_ORANGE} fillOpacity={0.55} />
        <Tooltip contentStyle={{ border: '2px solid black', borderRadius: 6, fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
