'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type NavItem = { href: string; label: string; matches?: (path: string) => boolean };

const NAV: NavItem[] = [
  { href: '/', label: 'Vakalar', matches: (p) => p === '/' || p.startsWith('/vaka') },
  { href: '/ilerleme', label: 'İlerleme' },
  { href: '/gecmis', label: 'Geçmiş', matches: (p) => p === '/gecmis' || p.startsWith('/rapor') || p.startsWith('/seans/') },
  { href: '/ayarlar', label: 'Ayarlar' },
];

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  function isActive(item: NavItem) {
    if (item.matches) return item.matches(pathname);
    return pathname === item.href;
  }

  return (
    <div className="md:grid md:grid-cols-[15rem_1fr] min-h-[calc(100vh-2rem)]">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-paper/95 backdrop-blur border-b border-rule px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-mono text-sm font-semibold tracking-tight">
          psk<span className="text-accent">.</span>
        </a>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Menü"
          className="text-xl px-2 -mr-2"
        >
          ☰
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col border-r border-rule px-6 py-8 sticky top-0 h-screen overflow-y-auto">
        <a href="/" className="block mb-12">
          <p className="font-mono text-lg font-semibold tracking-tight">
            psk<span className="text-accent">.</span>
          </p>
          <p className="text-[11px] text-muted mt-0.5">Psikoloji pratiği</p>
        </a>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} />
          ))}
        </nav>

        <div className="border-t border-rule pt-5 mt-5 space-y-2">
          {userEmail && (
            <p className="text-xs text-muted truncate" title={userEmail}>
              {userEmail}
            </p>
          )}
          <button onClick={signOut} className="btn-quiet text-xs">
            Çıkış yap →
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden
        className={`md:hidden fixed inset-0 bg-ink/40 backdrop-blur-sm z-40 transition-opacity ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 max-w-[85%] bg-paper border-r border-rule z-50 transition-transform duration-250 px-6 py-7 flex flex-col ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-10">
          <a href="/" className="font-mono text-lg font-semibold tracking-tight">
            psk<span className="text-accent">.</span>
          </a>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Kapat"
            className="text-lg text-muted"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} />
          ))}
        </nav>
        <div className="border-t border-rule pt-5 mt-5 space-y-2">
          {userEmail && <p className="text-xs text-muted truncate">{userEmail}</p>}
          <button onClick={signOut} className="btn-quiet text-xs">
            Çıkış yap →
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <a
      href={item.href}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
        active
          ? 'bg-accent-bg text-accent'
          : 'text-ink-soft hover:bg-paper-deep hover:text-ink'
      }`}
    >
      <span>{item.label}</span>
      {active && <span className="text-xs">●</span>}
    </a>
  );
}
