import React, { useState, useEffect } from 'react';
import { Clock, Mic, MailCheck } from 'lucide-react';
import Button from './Button';
import FormField from './FormField';
import { OCCASIONS, VOICES, MAX_CHARACTERS } from '../constants';
import { GreetingFormData } from '../types';

type GreetingFormProps = {
  onSubmit: (data: GreetingFormData) => void;
  isGenerating: boolean;
  isAudioGenerated: boolean;
  onSendEmail: () => void;
  onShareLink: () => void;
};

const GreetingForm: React.FC<GreetingFormProps> = ({
  onSubmit,
  isGenerating,
  isAudioGenerated,
  onSendEmail,
  onShareLink
}) => {
  const [message, setMessage] = useState('');
  const [occasionId, setOccasionId] = useState(OCCASIONS[0].id);
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [characterCount, setCharacterCount] = useState(0);

  useEffect(() => {
    setCharacterCount(message.length);
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ message, occasionId, voiceId });
  };

  const handleOccasionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOccasionId(e.target.value);
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVoiceId(e.target.value);
  };

  const handleTemplateSelect = (template: string) => {
    setMessage(template);
  };

  const selectedOccasion = OCCASIONS.find(o => o.id === occasionId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormField
        label="Select occasion"
        htmlFor="occasion"
        description="Choose the type of greeting you want to create"
      >
        <div className="relative">
          <select
            id="occasion"
            value={occasionId}
            onChange={handleOccasionChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-4 pr-10 py-2 bg-white text-gray-900"
          >
            {OCCASIONS.map((occasion) => (
              <option key={occasion.id} value={occasion.id}>
                {occasion.emoji} {occasion.name}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField
        label="Select voice"
        htmlFor="voice"
        description="Choose the voice for your audio greeting"
      >
        <div className="relative">
          <select
            id="voice"
            value={voiceId}
            onChange={handleVoiceChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-4 pr-10 py-2 bg-white text-gray-900"
          >
            {VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} {voice.description ? `- ${voice.description}` : ''}
              </option>
            ))}
          </select>
        </div>
      </FormField>

      {selectedOccasion && (
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Template suggestions:</h3>
          <div className="space-y-2">
            {selectedOccasion.templates.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className="text-sm text-left w-full p-2 bg-white rounded border border-gray-200 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
              >
                {template}
              </button>
            ))}
          </div>
        </div>
      )}

      <FormField
        label="Your message"
        htmlFor="message"
        error={message.length > MAX_CHARACTERS ? `Exceeded maximum character limit of ${MAX_CHARACTERS}` : undefined}
      >
        <div className="relative">
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your personalized greeting message here..."
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-y"
            maxLength={MAX_CHARACTERS}
          />
          <div className={`text-sm mt-2 text-right ${characterCount > MAX_CHARACTERS ? 'text-red-500' : 'text-gray-500'}`}>
            {characterCount}/{MAX_CHARACTERS} characters
          </div>
        </div>
      </FormField>

      <div className="flex flex-wrap gap-3">
        <Button 
          type="submit" 
          disabled={!message.trim() || message.length > MAX_CHARACTERS || isGenerating}
          icon={<Mic className="h-4 w-4" />}
        >
          {isGenerating ? 'Generating...' : 'Generate Audio'}
        </Button>

        {isAudioGenerated && (
          <>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onSendEmail}
              icon={<MailCheck className="h-4 w-4" />}
            >
              Send via Email
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onShareLink}
              icon={<Clock className="h-4 w-4" />}
            >
              Share Link
            </Button>
          </>
        )}
      </div>
    </form>
  );
};

export default GreetingForm;