import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Grokie Inu | AI Agent Marketplace on Solana',
  description: 'Decentralized marketplace for AI agents. Creators host agents, users pay with SOL.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-950 text-white min-h-screen font-sans">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-64 min-h-screen">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
