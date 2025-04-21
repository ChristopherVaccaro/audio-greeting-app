import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Header from './components/Header';
import GreetingForm from './components/GreetingForm';
import AudioPlayer from './components/AudioPlayer';
import ApiKeyModal from './components/ApiKeyModal';
import EmailModal from './components/EmailModal';
import ShareLinkModal from './components/ShareLinkModal';
import Footer from './components/Footer';
import elevenlabsService from './services/elevenlabsService';
import { GreetingFormData, AudioState } from './types';

function App() {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>({
    isGenerating: false,
    isPlaying: false,
    audioUrl: null,
    error: null
  });

  // Check if API key is already set
  useEffect(() => {
    const apiKey = elevenlabsService.getApiKey();
    if (!apiKey) {
      setApiKeyModalOpen(true);
    }
  }, []);

  const handleApiKeySubmit = (apiKey: string) => {
    elevenlabsService.setApiKey(apiKey);
  };

  const handleGenerateAudio = async (data: GreetingFormData) => {
    try {
      setAudioState({
        isGenerating: true,
        isPlaying: false,
        audioUrl: null,
        error: null
      });

      const audioUrl = await elevenlabsService.generateSpeech(data.message, data.voiceId);
      
      setAudioState({
        isGenerating: false,
        isPlaying: false,
        audioUrl,
        error: null
      });
    } catch (error) {
      console.error('Error generating audio:', error);
      
      let errorMessage = 'An error occurred while generating the audio.';
      
      if (error instanceof Error) {
        if (error.message.includes('API key not set')) {
          errorMessage = 'API key not set. Please configure your ElevenLabs API key.';
          setApiKeyModalOpen(true);
        } else {
          errorMessage = error.message;
        }
      }
      
      setAudioState({
        isGenerating: false,
        isPlaying: false,
        audioUrl: null,
        error: errorMessage
      });
    }
  };

  const handleSendEmail = (email: string) => {
    // In a real app, we would implement email sending functionality here
    // For this demo, we'll just show a success message
    alert(`Audio greeting would be sent to ${email} in a production environment.`);
  };

  const handleShareLink = () => {
    setShareLinkModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onOpenApiKeyModal={() => setApiKeyModalOpen(true)} />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Create Personalized Audio Greetings
            </h1>
            <p className="mt-3 text-xl text-gray-500">
              Transform your words into lifelike speech and share with friends and family
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Customize Your Greeting</h2>
              <GreetingForm 
                onSubmit={handleGenerateAudio}
                isGenerating={audioState.isGenerating}
                isAudioGenerated={!!audioState.audioUrl}
                onSendEmail={() => setEmailModalOpen(true)}
                onShareLink={handleShareLink}
              />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Preview & Share</h2>
              
              {audioState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700">{audioState.error}</p>
                </div>
              )}
              
              <AudioPlayer 
                audioUrl={audioState.audioUrl} 
                isGenerating={audioState.isGenerating} 
              />
              
              {audioState.audioUrl && (
                <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-indigo-800 mb-2">What's next?</h3>
                  <p className="text-sm text-indigo-700">
                    Your audio greeting is ready! You can now download it, send it via email, or 
                    share it using a link. The audio file is in MP3 format, compatible with most devices.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      
      <ApiKeyModal 
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSubmit={handleApiKeySubmit}
      />
      
      <EmailModal 
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
      />
      
      <ShareLinkModal 
        isOpen={shareLinkModalOpen}
        onClose={() => setShareLinkModalOpen(false)}
        audioUrl={audioState.audioUrl}
      />
    </div>
  );
}

export default App;