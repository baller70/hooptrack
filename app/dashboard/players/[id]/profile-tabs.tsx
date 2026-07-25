'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export type ProfileTab = {
  key: string
  label: string
  content: React.ReactNode
}

/**
 * The STATS / CLIPS / ASSIGNMENTS / NOTES switcher from
 * 013-coach-player-profile-review-raw.png. Every panel is rendered on the
 * server and handed in as a child, so switching tabs never refetches.
 */
export default function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key)
  const current = tabs.find((tab) => tab.key === active) ?? tabs[0]

  return (
    <div className="mt-5">
      <div className="overflow-hidden rounded-xl border border-ht-line bg-ht-surface">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))` }}>
          {tabs.map((tab) => {
            const selected = tab.key === current?.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                aria-pressed={selected}
                className={cn(
                  'ht-heading relative px-1 py-3.5 text-[12px] tracking-[0.01em] transition-colors',
                  selected ? 'text-ht-orange' : 'text-ht-ink hover:text-ht-orange',
                )}
              >
                {tab.label}
                {selected ? (
                  <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-ht-orange" />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4">{current?.content}</div>
    </div>
  )
}
