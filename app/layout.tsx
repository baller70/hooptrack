import type { Metadata } from 'next'
import { Russo_One, Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const russoOne = Russo_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-russo',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'HoopTrack',
  description: 'Basketball accountability workout tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HoopTrack',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${russoOne.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-gray-50">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
