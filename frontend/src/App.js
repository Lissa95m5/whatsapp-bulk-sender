import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import '@/App.css';
import { Dashboard } from '@/components/Dashboard';
import { MessageComposer } from '@/components/MessageComposer';
import { Settings } from '@/components/Settings';
import { Toaster } from '@/components/ui/sonner';
import { Home, Send, Settings as SettingsIcon, MessageSquare } from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/compose', label: 'Compose', icon: Send },
    { path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 bg-zinc-950 text-white min-h-screen p-6" data-testid="sidebar">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-8 h-8 text-emerald-500" />
          <h1 className="text-2xl font-bold font-['Plus_Jakarta_Sans']">WhatsApp</h1>
        </div>
        <p className="text-sm text-zinc-400 font-['Inter']">Bulk Sender</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium font-['Inter']">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-12 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
        <p className="text-xs text-zinc-400 font-['Inter'] mb-2">Need help?</p>
        <p className="text-sm text-zinc-300 font-['Inter']">
          Configure your Twilio credentials in Settings to start sending messages.
        </p>
      </div>
    </div>
  );
}

function MainContent() {
  return (
    <div className="flex-1 bg-zinc-50 p-8 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compose" element={<MessageComposer />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen" data-testid="app">
        <Sidebar />
        <MainContent />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}

export default App;
