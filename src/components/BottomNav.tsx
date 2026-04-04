import { useLocation, useNavigate } from 'react-router-dom';
import { Newspaper, MessageCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/brief', label: 'Brief', icon: Newspaper },
  { path: '/chat', label: 'Chat', icon: MessageCircle },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-glass flex items-center justify-around px-4 safe-area-bottom">
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-4 text-[11px] font-medium transition-colors',
              active ? 'text-[#00A3FF]' : 'text-[#8E8E93]'
            )}
          >
            <Icon className={cn('h-5 w-5', active && 'drop-shadow-[0_0_6px_rgba(0,163,255,0.4)]')} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
