import React, { useState, useEffect, useCallback } from 'react';

import { AlertCircle, Loader2, Volume } from 'lucide-react';
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

import { getVoices, generateTTS, ElevenLabsVoice, AddVoiceResponse, AuthResponse } from './services/elevenlabs';
import { AudioState, CurrentUser } from './types/index';

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
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
     const storedUser = localStorage.getItem('currentUser');
     try { 
       const parsedUser = storedUser ? JSON.parse(storedUser) : null;
       if (parsedUser && parsedUser.userId && parsedUser.email) {
          return parsedUser;
       }
       localStorage.removeItem('currentUser');
       localStorage.removeItem('authToken');
       return null;
     } catch { 
       localStorage.removeItem('currentUser');
       localStorage.removeItem('authToken');
       return null; 
     }
  });
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);


  const handleLogout = useCallback(() => {
    console.log('Logging out');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('elevenlabs_api_key');
    setAuthToken(null);
    setCurrentUser(null);
    setVoices([]); 
    setSelectedVoice(null);
    setVoicesError(null);
    setAudioState({ isGenerating: false, isPlaying: false, audioUrl: null, error: null });
    setAuthView('login'); 
  }, []);

  const fetchVoices = useCallback(async (token: string | null) => {
    if (!token) {
        setVoices([]);
        setSelectedVoice(null);
        setIsLoadingVoices(false);
        return;
    }
    console.log("Fetching voices with token...");
    setIsLoadingVoices(true);
    setVoicesError(null);
    try {
      const fetchedVoices = await getVoices(); 
      console.log(`Fetched ${fetchedVoices.length} voices.`);
      setVoices(fetchedVoices);
      if (fetchedVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(fetchedVoices[0]);
        console.log("Default selected voice:", fetchedVoices[0].name);
      } else if (fetchedVoices.length === 0) {
          setSelectedVoice(null); 
      }
    } catch (error: any) {
      console.error('Error fetching voices:', error);

      const errorMessage = error.message || 'Failed to load voices.';
      setVoicesError(errorMessage);
      if (errorMessage.includes('Unauthorized')) { 
          console.warn('Auth error during fetchVoices, logging out.');
          handleLogout();
      }
    } finally {
      setIsLoadingVoices(false);
    }

  }, [handleLogout, selectedVoice]);

  useEffect(() => {
    setAuthLoading(true);
    const token = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('currentUser');
    
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user && user.userId && user.email) {
          console.log("User and token found, setting state and fetching voices...");
          setAuthToken(token);
          setCurrentUser(user);
          fetchVoices(token);
        } else {
          console.warn("Invalid user data found in storage, logging out.");
          handleLogout(); 
        }
      } catch (e) {
        console.error("Failed to parse user data, logging out.", e);
        handleLogout(); 
      }
    } else {
        console.log("No user or token found in storage.");
        if (authToken || currentUser) {
             console.warn("Inconsistent auth state detected (state yes, storage no), logging out.");
             handleLogout();
        }
        setIsLoadingVoices(false);
    }
    setAuthLoading(false); 
  }, [handleLogout, fetchVoices]);

  const handleLoginSuccess = (data: AuthResponse) => {
    console.log('Login successful');
    const userData: CurrentUser = { userId: data.userId, email: data.email }; 
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setAuthToken(data.token);
    setCurrentUser(userData);
    setAuthView('login');
    setVoicesError(null);
    setAudioState({ isGenerating: false, isPlaying: false, audioUrl: null, error: null });
    fetchVoices(data.token);
  };

  const handleRegisterSuccess = () => {
    console.log('Registration successful, switch to login view.');
    setAuthView('login');
  };

  const switchToRegister = () => setAuthView('register');
  const switchToLogin = () => setAuthView('login');
  const handleVoiceCloned = (newVoice: AddVoiceResponse) => {
    console.log('New voice cloned, refetching voices list...');

    const currentToken = localStorage.getItem('authToken');
    if (currentToken) {
        fetchVoices(currentToken); 
    } else {
        console.warn('Cannot refetch voices, user not logged in.');
        handleLogout(); 
    }
  };

  const handleApiKeySubmit = (apiKey: string) => {
    console.log('Legacy API Key submitted');
    localStorage.setItem('elevenlabs_api_key_legacy', apiKey); 
    setApiKeyModalOpen(false);
  };

  const handleGenerateAudio = async (data: { voiceId: string; message: string }) => {
    const currentToken = localStorage.getItem('authToken');
    if (!currentToken) {
        console.warn("Attempted to generate audio while logged out.");
        setAudioState(prev => ({ ...prev, error: 'Please log in to generate audio.' }));
        handleLogout(); 
        return;
    }
    console.log(`Generating audio with voice ID: ${data.voiceId}`);
    setAudioState({
      isGenerating: true,
      isPlaying: false,
      audioUrl: null,
      error: null
    });
    try {
       const audioBlob = await generateTTS(data.voiceId, data.message, currentToken); 
       const audioUrl = URL.createObjectURL(audioBlob);
       console.log("Audio generated successfully.");
       setAudioState({
         isGenerating: false,
         isPlaying: false,
         audioUrl,
         error: null
       });
    } catch (error: any) { 
       console.error('Error generating audio:', error);
       const errorMessage = error.message || 'An error occurred while generating the audio.';
       setAudioState(prev => ({ ...prev, isGenerating: false, error: errorMessage }));
       if (errorMessage.includes('Unauthorized')) { 
           console.warn('Auth error during generateTTS, logging out.');
           handleLogout();
       }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!authToken || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
         <div className="w-full max-w-md">
             <div className="text-center mb-8">
                <Volume className="h-12 w-12 text-indigo-600 mx-auto" />
                <h1 className="mt-4 text-3xl font-bold text-gray-900">AudioGreets</h1>
             </div>
            {authView === 'login' ? (
                <LoginForm
                  onLoginSuccess={handleLoginSuccess}
                  switchToRegister={switchToRegister}
                />
            ) : (
                <RegisterForm 
                  onRegisterSuccess={handleRegisterSuccess}
                  switchToLogin={switchToLogin}
                />
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header 
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {voicesError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-grow">
                    <h3 className="text-sm font-medium text-red-800">Error Loading Voices</h3>
                    <p className="text-red-700 mt-1">{voicesError}</p>
                    <button onClick={() => fetchVoices(authToken)} className="mt-2 text-sm font-medium text-red-700 hover:underline">Retry</button>
                  </div>
                   <button onClick={() => setVoicesError(null)} className="ml-auto text-red-500 hover:text-red-700 p-1 -m-1">
                     <span className="sr-only">Dismiss</span>
                     &times;
                   </button>
                </div>
              )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow border border-gray-200">
               <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">1. Add Custom Voice</h2>
               <VoiceCloningForm onVoiceCloned={handleVoiceCloned} />
            </div>

            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">2. Generate Greeting</h2>
              {isLoadingVoices && !voicesError ? (
                 <div className="text-center py-10">
                   <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
                   <p className="mt-2 text-sm text-gray-500">Loading voices...</p>
                 </div>
              ) : voices.length === 0 && !voicesError && !isLoadingVoices ? (
                 <div className="text-center py-10 text-gray-500">
                    <p>No voices found.</p>
                    <p className="text-sm mt-1">Add a custom voice in Step 1 or check your ElevenLabs account.</p>
                 </div>
              ) : !voicesError && !isLoadingVoices ? (
                 <TextToSpeechForm 
                   onSubmit={handleGenerateAudio}
                   isGenerating={audioState.isGenerating}
                   isAudioGenerated={!!audioState.audioUrl}
                   onSendEmail={() => setEmailModalOpen(true)}
                   onShareLink={() => setShareLinkModalOpen(true)}
                   availableVoices={voices} 
                   isLoadingVoices={false}
                   voicesError={null}
                 />
               ) : null }
            </div>
            
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">3. Preview & Share</h2>
              
              {audioState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 flex-grow">{audioState.error}</p>
                   <button onClick={() => setAudioState(prev => ({...prev, error: null}))} className="ml-auto text-red-500 hover:text-red-700 p-1 -m-1">
                      <span className="sr-only">Dismiss</span>
                      &times;
                   </button>
                </div>
              )}
              
              <AudioPlayer 
                audioUrl={audioState.audioUrl} 
                isGenerating={audioState.isGenerating} 
              />
              
              {audioState.audioUrl && !audioState.isGenerating && (
                <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-indigo-800 mb-2">What's next?</h3>
                  <p className="text-sm text-indigo-700">
                    Your audio greeting is ready! Use the buttons in Step 2 to share or download.
                  </p>
                </div>
              )}
               {!audioState.audioUrl && !audioState.isGenerating && !audioState.error && (
                 <div className="text-center py-10 text-gray-400">
                    <p>Generate an audio greeting in Step 2 to preview it here.</p>
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

      <ApiKeyModal 
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onSubmit={handleApiKeySubmit}
      />
    </div>
  );
}

export default App;