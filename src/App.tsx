import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import Header from './components/Header';
import TextToSpeechForm from './components/TextToSpeechForm';
import VoiceCloningForm from './components/VoiceCloningForm';
import AudioPlayer from './components/AudioPlayer';
import ApiKeyModal from './components/ApiKeyModal';
import EmailModal from './components/EmailModal';
import ShareLinkModal from './components/ShareLinkModal';
import Footer from './components/Footer';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import elevenlabsService from './services/elevenlabsService';
import { getVoices, generateTTS, ElevenLabsVoice, AddVoiceResponse, AuthResponse } from './services/elevenlabs';
import { AudioState, CurrentUser } from './types';

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

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [voicesError, setVoicesError] = useState<string | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const storedUser = localStorage.getItem('currentUser');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const fetchVoices = async (token: string | null) => {
    if (!token) {
      setVoices([]);
      setIsLoadingVoices(false);
      setVoicesError('Please log in to load voices.');
      return;
    }
    setIsLoadingVoices(true);
    setVoicesError(null);
    try {
      const fetchedVoices = await getVoices(token);
      setVoices(fetchedVoices);
    } catch (error: any) {
      console.error('Error fetching voices:', error);
      setVoicesError(error.message || 'Failed to load voices.');
      if (error.message.includes('Unauthorized')) {
        setVoicesError('Session expired or invalid. Please log out and log back in.');
      }
    } finally {
      setIsLoadingVoices(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('currentUser');
    if (token && userJson) {
      try {
        setAuthToken(token);
        setCurrentUser(JSON.parse(userJson));
        fetchVoices(token);
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        setAuthToken(null);
        setCurrentUser(null);
      }
    } else {
      setIsLoadingVoices(false);
    }
    setAuthLoading(false);
  }, []);

  const handleLoginSuccess = useCallback((data: AuthResponse) => {
    console.log('Login successful', data);
    const { token, ...userData } = data;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setAuthToken(token);
    setCurrentUser(userData);
    setAuthView('login');
    fetchVoices(token);
  }, []);

  const handleRegisterSuccess = useCallback(() => {
    console.log('Registration successful');
    setAuthView('login');
  }, []);

  const handleLogout = useCallback(() => {
    console.log('Logging out');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setAuthToken(null);
    setCurrentUser(null);
    setVoices([]);
    setVoicesError(null);
    setAuthView('login');
  }, []);

  const handleVoiceCloned = useCallback((newVoice: AddVoiceResponse) => {
    console.log('New voice cloned, refetching voices list...');
    if (authToken) {
      fetchVoices(authToken);
    } else {
      console.warn('Cannot refetch voices, user not logged in.');
    }
  }, [authToken]);

  const handleApiKeySubmit = (apiKey: string) => {
    console.log('API Key modal submitted - functionality might need review');
  };

  const handleGenerateAudio = async (data: { voiceId: string; message: string }) => {
    if (!authToken) {
      setAudioState(prev => ({ ...prev, error: 'Please log in to generate audio.' }));
      return;
    }
    setAudioState({
      isGenerating: true,
      isPlaying: false,
      audioUrl: null,
      error: null
    });

    try {
      const audioBlob = await generateTTS(data.voiceId, data.message, authToken);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setAudioState({
        isGenerating: false,
        isPlaying: false,
        audioUrl,
        error: null
      });
    } catch (error: any) {
      console.error('Error generating audio:', error);
      let errorMessage = 'An error occurred while generating the audio.';
      if (error instanceof Error) {
        errorMessage = error.message; 
        if (error.message.includes('Unauthorized')) {
          handleLogout();
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
    alert(`Audio greeting would be sent to ${email} in a production environment.`);
  };

  const handleShareLink = () => {
    setShareLinkModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!authToken || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
        {authView === 'login' ? (
          <LoginForm 
            onLoginSuccess={handleLoginSuccess} 
            switchToRegister={() => setAuthView('register')} 
          />
        ) : (
          <RegisterForm 
            onRegisterSuccess={handleRegisterSuccess} 
            switchToLogin={() => setAuthView('login')} 
          />
        )}
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header 
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)} 
        user={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Create Personalized Audio Greetings
            </h1>
            <p className="mt-3 text-xl text-gray-500">
              Clone voices and transform your words into lifelike speech
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
               <h2 className="text-xl font-semibold text-gray-800 mb-6">1. Clone a Voice</h2>
               <VoiceCloningForm onVoiceCloned={handleVoiceCloned} />
            </div>

            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">2. Generate Greeting</h2>
              <TextToSpeechForm 
                onSubmit={handleGenerateAudio}
                isGenerating={audioState.isGenerating}
                isAudioGenerated={!!audioState.audioUrl}
                onSendEmail={() => setEmailModalOpen(true)}
                onShareLink={handleShareLink}
                availableVoices={voices}
                isLoadingVoices={isLoadingVoices}
                voicesError={voicesError}
              />
            </div>
            
            <div className="lg:col-span-1">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">3. Preview & Share</h2>
              
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
                    share it using a link.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      
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