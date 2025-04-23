import React, { useState } from 'react';
import { Key } from 'lucide-react';
import Button from './Button';
import FormField from './FormField';

type ApiKeyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKey: string) => void;
};

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSubmit }) => {
  // Try reading initial key from localStorage (might be empty)
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('elevenlabs_api_key_legacy') || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(apiKey); 
  };

  return (
    // Modal Overlay
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      {/* Modal Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mr-3">
              <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">ElevenLabs API Key (Legacy)</h2>
          </div>
          
          {/* Body Content */}
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            This setting might be deprecated if using account authentication. If needed, enter your ElevenLabs API key here.
          </p>
          
          <form onSubmit={handleSubmit}>
            <FormField label="API Key" htmlFor="api-key"> 
              <input
                type="password" // Use password type to obscure key
                id="api-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 sm:text-sm"
                placeholder="Enter your API key"
              />
            </FormField>
            
            {/* Footer Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!apiKey.trim()}> 
                Save Key
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;