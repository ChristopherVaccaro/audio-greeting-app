import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Loader2, Mic, MailCheck, Clock, AlertTriangle } from 'lucide-react';
import Button from './Button';
import FormField from './FormField';
// Import types from the service file
import { ElevenLabsVoice } from '../services/elevenlabs';

// Constants - maybe move MAX_CHARACTERS somewhere more global?
const MAX_CHARACTERS = 500; // Example character limit

// Define the props, including the new ones for voice list
type TextToSpeechFormProps = {
  onSubmit: (data: { voiceId: string; message: string }) => void;
  isGenerating: boolean;
  isAudioGenerated: boolean;
  onSendEmail: () => void;
  onShareLink: () => void;
  availableVoices: ElevenLabsVoice[];
  isLoadingVoices: boolean;
  voicesError: string | null;
};

const TextToSpeechForm: React.FC<TextToSpeechFormProps> = ({
  onSubmit,
  isGenerating,
  isAudioGenerated,
  onSendEmail,
  onShareLink,
  availableVoices,
  isLoadingVoices,
  voicesError,
}) => {
  const [message, setMessage] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [characterCount, setCharacterCount] = useState(0);

  // Effect to update character count
  useEffect(() => {
    setCharacterCount(message.length);
  }, [message]);

  // Effect to set a default voice when the list loads
  useEffect(() => {
    if (!selectedVoiceId && availableVoices.length > 0) {
      // Select the first voice by default, or maybe a specific one?
      setSelectedVoiceId(availableVoices[0].voice_id);
    }
  }, [availableVoices, selectedVoiceId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVoiceId) {
      // Should ideally not happen if a default is set, but good practice
      console.error("No voice selected");
      return;
    }
    onSubmit({ message, voiceId: selectedVoiceId });
  };

  const handleVoiceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoiceId(e.target.value);
  };

  // Handle message change
  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <FormField
        label="Select voice"
        htmlFor="voice-select"
        description="Choose the cloned or pre-made voice for your greeting"
        error={voicesError || undefined}
      >
        <div className="relative">
          <select
            id="voice-select"
            value={selectedVoiceId}
            onChange={handleVoiceChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-4 pr-10 py-2 bg-white text-gray-900 disabled:opacity-50 disabled:bg-gray-100"
            disabled={isLoadingVoices || availableVoices.length === 0}
          >
            {isLoadingVoices && (
              <option value="" disabled>Loading voices...</option>
            )}
            {!isLoadingVoices && availableVoices.length === 0 && !voicesError && (
              <option value="" disabled>No voices available. Try cloning one first.</option>
            )}
             {!isLoadingVoices && voicesError && (
              <option value="" disabled>Error loading voices.</option>
            )}
            {!isLoadingVoices && availableVoices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                 {voice.name} ({voice.category || 'custom'}) 
              </option>
            ))}
          </select>
          {isLoadingVoices && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
          )}
           {voicesError && (
               <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
           )}
        </div>
      </FormField>

      {/* Optionally add back occasion selection or templates if desired */}
      {/* ... */}

      <FormField
        label="Your message"
        htmlFor="message"
        error={message.length > MAX_CHARACTERS ? `Exceeded maximum character limit of ${MAX_CHARACTERS}` : undefined}
      >
        <div className="relative">
          <textarea
            id="message"
            value={message}
            onChange={handleMessageChange}
            placeholder="Type your personalized greeting message here..."
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-y disabled:opacity-50 disabled:bg-gray-100"
            maxLength={MAX_CHARACTERS}
            disabled={!selectedVoiceId || isGenerating}
          />
          <div className={`text-sm mt-2 text-right ${characterCount > MAX_CHARACTERS ? 'text-red-500' : 'text-gray-500'}`}>
            {characterCount}/{MAX_CHARACTERS} characters
          </div>
        </div>
      </FormField>

      <div className="flex flex-wrap gap-3">
        <Button 
          type="submit" 
          disabled={!message.trim() || !selectedVoiceId || message.length > MAX_CHARACTERS || isGenerating || isLoadingVoices}
          icon={isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mic className="h-4 w-4 mr-2" />}
        >
          {isGenerating ? 'Generating...' : 'Generate Audio'}
        </Button>

        {isAudioGenerated && (
          <>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onSendEmail}
              icon={<MailCheck className="h-4 w-4 mr-2" />}
            >
              Send via Email
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onShareLink}
              icon={<Clock className="h-4 w-4 mr-2" />}
            >
              Share Link
            </Button>
          </>
        )}
      </div>
    </form>
  );
};

export default TextToSpeechForm; 