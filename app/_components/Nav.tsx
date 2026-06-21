'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Add a tab? Add one line here + a matching app/<name>/page.tsx. That's it.
const TABS = [
  { href: '/', label: 'Dashboard' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/money', label: 'Money' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/projects', label: 'Projects' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/content', label: 'Content' },
  { href: '/influencers', label: 'Influencer Marketing' },
  { href: '/agents', label: 'Agents' },
]

export default function Nav() {
  const path = usePathname()
  // Close the mobile drawer whenever the route changes.
  useEffect(() => { document.body.classList.remove('nav-open') }, [path])
  return (
    <nav className="nav">
      {TABS.map(t => (
        <Link
          key={t.href}
          href={t.href}
          className={path === t.href ? 'active' : ''}
          onClick={() => document.body.classList.remove('nav-open')}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
