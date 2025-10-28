import React from 'react';

// Define a type for the view names for better type safety
export type View = 
  | 'chat' 
  | 'website-creator'
  | 'live-conversation'
  | 'pdf-compressor';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  view: View;
  label: string;
  currentView: View;
  setCurrentView: (view: View) => void;
  // FIX: Replaced JSX.Element with React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactNode;
}> = ({ view, label, currentView, setCurrentView, icon }) => (
  <button
    onClick={() => setCurrentView(view)}
    className={`flex items-center w-full px-4 py-3 text-sm font-medium text-left rounded-lg transition-colors ${
      currentView === view
        ? 'bg-primary text-white'
        : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </button>
);

const icons = {
    chat: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    'website-creator': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    'live-conversation': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V4a2 2 0 012-2h8a2 2 0 012 2v4z" /></svg>,
    'pdf-compressor': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
};


// FIX: Replaced JSX.Element with React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
const navItems: { view: View; label: string; icon: React.ReactNode; group: string }[] = [
  { view: 'chat', label: 'Chat', icon: icons.chat, group: 'General' },
  { view: 'website-creator', label: 'Website Creator', icon: icons['website-creator'], group: 'General' },
  { view: 'live-conversation', label: 'Live Conversation', icon: icons['live-conversation'], group: 'General' },
  { view: 'pdf-compressor', label: 'PDF Compressor', icon: icons['pdf-compressor'], group: 'Utilities' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {

    const groupedItems = navItems.reduce((acc, item) => {
        acc[item.group] = acc[item.group] || [];
        acc[item.group].push(item);
        return acc;
    }, {} as Record<string, typeof navItems>);

  return (
    <div className="h-full bg-surface text-text-primary p-4 flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold">Creator AI</h1>
        <p className="text-sm text-text-secondary">Powered by Gemini</p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto">
        {Object.entries(groupedItems).map(([groupName, items]) => (
            <div key={groupName}>
                <h2 className="px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">{groupName}</h2>
                <div className="space-y-1">
                    {items.map((item) => (
                        <NavItem
                            key={item.view}
                            view={item.view}
                            label={item.label}
                            currentView={currentView}
                            setCurrentView={setCurrentView}
                            icon={item.icon}
                        />
                    ))}
                </div>
            </div>
        ))}
      </nav>
    </div>
  );
};