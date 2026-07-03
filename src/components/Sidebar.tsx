'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { FaHome, FaStore, FaPlus, FaChartBar, FaBook, FaHeart, FaEnvelope, FaCoins, FaTrophy, FaGavel, FaQuestionCircle, FaBars, FaTimes, FaRobot } from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi2'
import { WalletButton } from './WalletButton'

const mainMenu = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/marketplace', label: 'Explore Agents', icon: FaStore },
  { href: '/dashboard', label: 'My Agents', icon: FaRobot },
  { href: '/dashboard', label: 'My Tasks', icon: FaChartBar, soon: true },
  { href: '#', label: 'Favorites', icon: FaHeart, soon: true },
  { href: '#', label: 'Messages', icon: FaEnvelope, soon: true },
]

const createMenu = [
  { href: '/create', label: 'Create Agent', icon: FaPlus },
  { href: '/dashboard', label: 'Dashboard', icon: FaChartBar },
]

const earnMenu = [
  { href: '#', label: 'Staking', icon: FaCoins, soon: true },
  { href: '#', label: 'Rewards', icon: FaTrophy, soon: true },
  { href: '#', label: 'Leaderboard', icon: FaTrophy, soon: true },
]

const communityMenu = [
  { href: '#', label: 'DAO Governance', icon: FaGavel, soon: true },
  { href: '#', label: 'Disputes', icon: FaGavel, soon: true },
  { href: '/docs', label: 'Docs', icon: FaBook },
  { href: '#', label: 'Support', icon: FaQuestionCircle, soon: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavLink = ({ item }: { item: { href: string; label: string; icon: any; soon?: boolean } }) => {
    const Icon = item.icon
    const isActive = pathname === item.href && !item.soon

    if (item.soon) {
      return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed">
          <Icon className="text-sm flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/30 text-primary-300 font-medium">Soon</span>
        </div>
      )
    }

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
          isActive ? 'bg-primary-500/20 text-primary-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="text-sm flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2 border-b border-white/5 mb-2">
        <Image src="/grokie-inu.png" alt="Grokie Inu" width={32} height={32} className="rounded-lg" />
        <div>
          <p className="text-sm font-bold gradient-text">Grokie Inu</p>
          <p className="text-[10px] text-gray-500">AI Agent Marketplace</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        {/* Main */}
        <div className="space-y-1">
          {mainMenu.map((item) => <NavLink key={item.label} item={item} />)}
        </div>

        {/* Create */}
        <div>
          <p className="px-3 text-[10px] uppercase text-gray-600 font-medium mb-2">Create</p>
          <div className="space-y-1">
            {createMenu.map((item) => <NavLink key={item.label} item={item} />)}
          </div>
        </div>

        {/* Earn */}
        <div>
          <p className="px-3 text-[10px] uppercase text-gray-600 font-medium mb-2">Earn</p>
          <div className="space-y-1">
            {earnMenu.map((item) => <NavLink key={item.label} item={item} />)}
          </div>
        </div>

        {/* Community */}
        <div>
          <p className="px-3 text-[10px] uppercase text-gray-600 font-medium mb-2">Community</p>
          <div className="space-y-1">
            {communityMenu.map((item) => <NavLink key={item.label} item={item} />)}
          </div>
        </div>
      </nav>

      {/* Wallet */}
      <div className="p-3 border-t border-white/5">
        <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-lg !font-semibold !text-xs !h-9 !w-full" />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-dark-950 border-r border-white/5 flex-col z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-dark-950/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Image src="/grokie-inu.png" alt="Grokie Inu" width={28} height={28} className="rounded-lg" />
          <span className="text-sm font-bold gradient-text">Grokie Inu</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-white/5">
          {mobileOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-dark-950 border-r border-white/5 z-50 overflow-y-auto">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Mobile top spacing */}
      <div className="lg:hidden h-14" />
    </>
  )
}
