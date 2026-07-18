'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useRouter } from 'next/navigation'

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> & {
  href: string
}

export function AppActionButton({ href, type = 'button', ...props }: Props) {
  const router = useRouter()

  return <button type={type} onClick={() => router.push(href)} {...props} />
}
