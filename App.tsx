
import React, { useState } from 'react';
import { Sidebar, View } from './components/Sidebar';
import { Chat } from './components/Chat';
import { ImageGenerator } from './components/ImageGenerator';
import { ImageEditor } from './components/ImageEditor';
import { ImageAnalyzer } from './components/ImageAnalyzer';
import { VideoGenerator } from './components/VideoGenerator';
import { VideoAnalyzer } from './components/VideoAnalyzer';
import { AudioTranscriber } from './components/AudioTranscriber';
import { PodcastCreator } from './components/PodcastCreator';
import { WebsiteCreator } from './components/WebsiteCreator';
import { LiveConversation } from './components/LiveConversation';
import { PdfCompressor } from './components/PdfCompressor';


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('chat');

  const renderContent = () => {
    switch (currentView) {
      case 'chat':
        return <Chat />;
      case 'image-generator':
        return <ImageGenerator />;
      case 'image-editor':
        return <ImageEditor />;
      case 'image-analyzer':
        return <ImageAnalyzer />;
      case 'video-generator':
        return <VideoGenerator />;
      case 'video-analyzer':
        return <VideoAnalyzer />;
      case 'audio-transcriber':
        return <AudioTranscriber />;
      case 'podcast-creator':
        return <PodcastCreator />;
      case 'website-creator':
        return <WebsiteCreator />;
      case 'live-conversation':
        return <LiveConversation />;
      case 'pdf-compressor':
        return <PdfCompressor />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="h-screen w-screen bg-background text-text-primary flex font-sans">
      <div className="w-64 h-full flex-shrink-0 border-r border-surface-light">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      </div>
      <main className="flex-1 h-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
