import React, { useState, useCallback, ChangeEvent, FormEvent } from 'react';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { addVoice, AddVoiceResponse } from '../services/elevenlabs';
import Button from './Button';
import FormField from './FormField';

type VoiceCloningFormProps = {
  onVoiceCloned: (newVoice: AddVoiceResponse) => void; // Callback after successful cloning
};

const VoiceCloningForm: React.FC<VoiceCloningFormProps> = ({ onVoiceCloned }) => {
  const [voiceName, setVoiceName] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(event.target.files);
      setStatusMessage(`${event.target.files.length} file(s) selected.`);
      setError(null); // Clear previous errors on new file selection
    }
  }, []);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!voiceName.trim()) {
      setError('Please enter a name for the voice.');
      return;
    }

    if (!files || files.length === 0) {
      setError('Please select at least one audio file (.mp3, .wav, etc.).');
      return;
    }
    
    // Basic validation for file types (optional but recommended)
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/flac'];
    for (let i = 0; i < files.length; i++) {
        if (!allowedTypes.includes(files[i].type)) {
             setError(`Unsupported file type: ${files[i].name} (${files[i].type}). Please use standard audio formats.`);
             return;
        }
    }

    setIsLoading(true);
    setStatusMessage('Uploading files and creating voice...');

    const formData = new FormData();
    formData.append('name', voiceName.trim());
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const newVoice = await addVoice(formData);
      setStatusMessage(`Voice '${newVoice.name}' created successfully! Voice ID: ${newVoice.voice_id}`);
      onVoiceCloned(newVoice); // Notify parent component
      // Reset form after success
      setVoiceName('');
      setFiles(null);
      // Clear file input visually (requires interaction with input ref or key change)
      // For simplicity, we rely on the user selecting new files next time.
      // Or force re-render: e.g., setFormKey(Date.now());

    } catch (err: any) {
      console.error("Voice cloning failed:", err);
      setError(err.message || 'An unknown error occurred during voice cloning.');
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [voiceName, files, onVoiceCloned]);

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Create Instant Voice Clone</h2>
      <p className="text-sm text-gray-600 mb-4">
        Upload 1-30 audio samples (at least 1 minute total, without background noise) 
        to create a clone of a voice. Name your voice for identification.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Voice Name"
          htmlFor="voice-name-input"
        >
          <input
            id="voice-name-input"
            type="text"
            value={voiceName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setVoiceName(e.target.value)}
            placeholder="e.g., Morgan Freeman Style"
            required
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
          />
        </FormField>

        <div>
          <label htmlFor="audio-files" className="block text-sm font-medium text-gray-700 mb-1">
            Audio Samples
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="audio-files-input"
                  className={`relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>Upload files</span>
                  <input 
                    id="audio-files-input" 
                    name="audio-files" 
                    type="file" 
                    multiple 
                    accept="audio/*,.m4a,.mp3,.wav,.ogg,.aac,.flac"
                    className="sr-only" 
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">MP3, WAV, FLAC, AAC, M4A etc. up to 50MB per file</p>
            </div>
          </div>
          {files && files.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-medium">Selected files:</p>
              <ul className="list-disc list-inside">
                {Array.from(files).map((file, index) => (
                  <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {statusMessage && !error && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">{statusMessage}</div>
        )}
        
        {error && (
           <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
             <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
             {error}
           </div>
        )}

        <Button 
          type="submit" 
          variant="primary"
          className="w-full flex justify-center"
          disabled={isLoading || !files || files.length === 0 || !voiceName.trim()}
          icon={isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        >
          {isLoading ? 'Creating Voice...' : 'Create Voice Clone'}
        </Button>
      </form>
    </div>
  );
};

export default VoiceCloningForm; 