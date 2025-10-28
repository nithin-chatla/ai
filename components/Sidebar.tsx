import React from 'react';

// Define a type for the view names for better type safety
export type View = 
  | 'chat' 
  | 'image-generator' 
  | 'image-editor'
  | 'image-analyzer'
  | 'video-generator'
  | 'video-analyzer'
  | 'audio-transcriber'
  | 'podcast-creator'
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
    'image-generator': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    'image-editor': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>,
    'image-analyzer': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    'video-generator': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    'video-analyzer': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V5a2 2 0 00-2-2h-7l-2 2v14l2 2zM15 7h.01M15 11h.01M15 15h.01M5 5h2m2 0h2m2 0h2m-4 4h2m-2 4h2m2 4h-2m-2 0h-2m-2 0H5" /></svg>,
    'audio-transcriber': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    'podcast-creator': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
    'website-creator': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
    'live-conversation': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V4a2 2 0 012-2h8a2 2 0 012 2v4z" /></svg>,
    'pdf-compressor': <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
};


// FIX: Replaced JSX.Element with React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
const navItems: { view: View; label: string; icon: React.ReactNode; group: string }[] = [
  { view: 'chat', label: 'Chat', icon: icons.chat, group: 'General' },
  { view: 'website-creator', label: 'Website Creator', icon: icons['website-creator'], group: 'General' },
  { view: 'live-conversation', label: 'Live Conversation', icon: icons['live-conversation'], group: 'General' },
  { view: 'image-generator', label: 'Image Generator', icon: icons['image-generator'], group: 'Image' },
  { view: 'image-editor', label: 'Image Editor', icon: icons['image-editor'], group: 'Image' },
  { view: 'image-analyzer', label: 'Image Analyzer', icon: icons['image-analyzer'], group: 'Image' },
  { view: 'video-generator', label: 'Video Generator', icon: icons['video-generator'], group: 'Video' },
  { view: 'video-analyzer', label: 'Video Analyzer', icon: icons['video-analyzer'], group: 'Video' },
  { view: 'podcast-creator', label: 'Podcast Creator', icon: icons['podcast-creator'], group: 'Audio' },
  { view: 'audio-transcriber', label: 'Audio Transcriber', icon: icons['audio-transcriber'], group: 'Audio' },
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