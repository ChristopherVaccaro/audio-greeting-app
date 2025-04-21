import React, { useState, useCallback, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import { UploadCloud, Loader2, AlertCircle, Mic, Square, Play, Trash2 } from 'lucide-react';
import { addVoice, AddVoiceResponse } from '../services/elevenlabs';
import Button from './Button';
import FormField from './FormField';

type VoiceCloningFormProps = {
  onVoiceCloned: (newVoice: AddVoiceResponse) => void;
};

type InputMode = 'upload' | 'record';

const VoiceCloningForm: React.FC<VoiceCloningFormProps> = ({ onVoiceCloned }) => {
  const [voiceName, setVoiceName] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('upload'); // 'upload' or 'record'
  
  // Upload state
  const [files, setFiles] = useState<FileList | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // To keep track of the stream for stopping tracks
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null); // For previewing recorded clips

  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // --- Upload Mode Handlers ---
  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(event.target.files);
      setStatusMessage(`${event.target.files.length} file(s) selected.`);
      setError(null); 
      setRecordedChunks([]); // Clear recordings if switching to upload with files
      setRecordingError(null);
    }
  }, []);

  // --- Recording Mode Handlers ---
  const requestMicrophonePermission = useCallback(async () => {
      console.log("Requesting microphone permission...");
      setRecordingError(null);
      setPermissionGranted(null); // Reset while requesting
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          setPermissionGranted(true);
          console.log("Microphone permission granted.");
      } catch (err) {
          console.error("Error getting microphone permission:", err);
          setRecordingError("Microphone access denied or unavailable. Please check browser settings.");
          setPermissionGranted(false);
          streamRef.current = null;
      }
  }, []);

  const startRecording = useCallback(() => {
      if (!streamRef.current || isRecording) return;
      console.log("Starting recording...");
      setRecordingError(null);

      try {
           // Determine supported MIME type
           const options = { mimeType: 'audio/webm' }; // Prefer webm
           if (!MediaRecorder.isTypeSupported(options.mimeType)) {
               console.warn('audio/webm not supported, trying default');
               options.mimeType = ''; // Let the browser choose a default
           }
           
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, options.mimeType ? options : undefined);
          const localChunks: Blob[] = [];

          mediaRecorderRef.current.ondataavailable = (event) => {
              if (event.data.size > 0) {
                  localChunks.push(event.data);
              }
          };

          mediaRecorderRef.current.onstop = () => {
              console.log("Recording stopped. Chunks collected:", localChunks.length);
              if (localChunks.length > 0) {
                  const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'; // Use actual mimeType if available
                  const recordedBlob = new Blob(localChunks, { type: mimeType });
                  setRecordedChunks(prev => [...prev, recordedBlob]);
                  localChunks.length = 0; // Clear local chunks
                  setStatusMessage(`Clip ${recordedChunks.length + 1} added.`); // Provide feedback
              }
              setIsRecording(false);
              // Don't stop tracks here, allow multiple recordings
          };

          mediaRecorderRef.current.onerror = (event) => {
              console.error("MediaRecorder error:", event);
              setRecordingError(`Recording error: ${(event as any).error?.message || 'Unknown error'}`);
              setIsRecording(false);
          };

          mediaRecorderRef.current.start();
          setIsRecording(true);
          setStatusMessage("Recording started...");
          setFiles(null); // Clear files if switching to record mode

      } catch (err: any) {
          console.error("Error starting MediaRecorder:", err);
          setRecordingError(`Failed to start recording: ${err.message}`);
          setIsRecording(false);
      }

  }, [isRecording, recordedChunks.length]); // Add recordedChunks length to update status message correctly

  const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
          console.log("Stopping recording...");
          mediaRecorderRef.current.stop();
          // onstop event handles setting isRecording to false and processing chunks
          // No need to explicitly set isRecording(false) here as onstop will fire
          setStatusMessage("Processing recording...");
      }
  }, [isRecording]);

  const deleteRecording = useCallback((index: number) => {
      setRecordedChunks(prev => prev.filter((_, i) => i !== index));
      if (playbackUrl) { // Stop playback if the deleted item was playing
          URL.revokeObjectURL(playbackUrl);
          setPlaybackUrl(null);
      }
  }, [playbackUrl]);

  const playRecording = useCallback((blob: Blob) => {
      if (playbackUrl) { // Clean up previous URL
          URL.revokeObjectURL(playbackUrl);
      }
      const url = URL.createObjectURL(blob);
      setPlaybackUrl(url); 
      // Use a simple audio element for playback preview
      const audio = new Audio(url);
      audio.play().catch(e => console.error("Playback error:", e));
      audio.onended = () => {
          URL.revokeObjectURL(url);
          setPlaybackUrl(null);
      };
  }, [playbackUrl]);

  // --- Cleanup Effect ---
  useEffect(() => {
      // This is the cleanup function that runs when the component unmounts
      return () => {
          console.log("Cleaning up VoiceCloningForm: Stopping recording and media stream.");
          // Stop recording if active
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
          }
          // Stop all tracks on the stream to release the microphone
          streamRef.current?.getTracks().forEach(track => track.stop());
          // Revoke any active playback URL
          if (playbackUrl) {
              URL.revokeObjectURL(playbackUrl);
          }
      };
  }, [playbackUrl]); // Include playbackUrl in dependencies to revoke it if it changes before unmount

  // --- Form Submission ---
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatusMessage(null);

    if (!voiceName.trim()) {
      setError('Please enter a name for the voice.');
      return;
    }

    let hasAudio = false;
    const formData = new FormData();
    formData.append('name', voiceName.trim());

    if (inputMode === 'upload') {
        if (!files || files.length === 0) {
          setError('Please select at least one audio file (.mp3, .wav, etc.).');
          return;
        }
        // Basic validation for file types
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/flac'];
        for (let i = 0; i < files.length; i++) {
            if (!allowedTypes.includes(files[i].type)) {
                 setError(`Unsupported file type: ${files[i].name} (${files[i].type}). Please use standard audio formats.`);
                 return;
            }
            formData.append('files', files[i]);
        }
        hasAudio = files.length > 0;
    } else { // inputMode === 'record'
        if (recordedChunks.length === 0) {
             setError('Please record at least one audio clip.');
            return;
        }
        // Append recorded blobs as files
        recordedChunks.forEach((blob, index) => {
            // Convert Blob to File before appending
            const file = new File([blob], `recording_${index + 1}.webm`, { type: blob.type }); // Use .webm or appropriate type
            formData.append('files', file);
        });
        hasAudio = recordedChunks.length > 0;
    }

    if (!hasAudio) { // Double check
        setError('No audio samples provided.');
        return;
    }

    setIsLoading(true);
    setStatusMessage('Uploading samples and creating voice...');

    try {
      const newVoice = await addVoice(formData);
      setStatusMessage(`Voice '${newVoice.name}' created successfully! Voice ID: ${newVoice.voice_id}`);
      onVoiceCloned(newVoice);
      // Reset form
      setVoiceName('');
      setFiles(null);
      setRecordedChunks([]);
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
      setPlaybackUrl(null);
      // Maybe reset inputMode to 'upload'?
      // setInputMode('upload')

    } catch (err: any) {
      console.error("Voice cloning failed:", err);
      setError(err.message || 'An unknown error occurred during voice cloning.');
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, [voiceName, files, inputMode, recordedChunks, onVoiceCloned, playbackUrl]);

  // --- UI Rendering ---
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Create Instant Voice Clone</h2>
      <p className="text-sm text-gray-600 mb-4">
        Upload 1-30 audio samples (at least 1 minute total, without background noise) 
        or record directly using your microphone to create a voice clone.
      </p>

      {/* Mode Switcher */}
      <div className="mb-4 flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`py-2 px-4 text-sm font-medium ${inputMode === 'upload' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Upload Files
        </button>
        <button
          type="button"
          onClick={() => setInputMode('record')}
          className={`py-2 px-4 text-sm font-medium ${inputMode === 'record' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Record Audio
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Voice Name Input (Common to both modes) */}
        <FormField
          label="Voice Name"
          htmlFor="voice-name-input"
        >
          <input
            id="voice-name-input"
            type="text"
            value={voiceName}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setVoiceName(e.target.value)}
            placeholder="e.g., My Voice Clone"
            required
            disabled={isLoading}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
          />
        </FormField>

        {/* === Upload Mode UI === */}
        {inputMode === 'upload' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audio Samples (Upload)
            </label>
            {/* File Drop Zone */}
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
            {/* Selected Files Display */}
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
        )}

        {/* === Record Mode UI === */}
        {inputMode === 'record' && (
            <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                    Audio Samples (Record)
                </label>
                 {/* Permission Handling */}
                 {permissionGranted === null && (
                     <Button type="button" onClick={requestMicrophonePermission} variant="secondary">
                         Request Microphone Permission
                     </Button>
                 )}
                 {permissionGranted === false && (
                     <p className="text-sm text-red-600">Microphone access denied. Please enable it in your browser settings.</p>
                 )}

                 {/* Recording Controls */}
                 {permissionGranted === true && (
                     <div className="flex items-center gap-3">
                         <Button 
                             type="button" 
                             onClick={isRecording ? stopRecording : startRecording}
                             variant={isRecording ? "secondary" : "secondary"}
                             className={isRecording ? 'text-red-600 hover:text-red-700' : ''}
                             icon={isRecording ? <Square className="h-4 w-4"/> : <Mic className="h-4 w-4"/>}
                             disabled={isLoading}
                         >
                           {isRecording ? 'Stop Recording' : 'Start Recording'}
                         </Button>
                         {isRecording && (
                             <span className="text-sm text-red-600 animate-pulse">Recording...</span>
                         )}
                     </div>
                 )}

                {/* Display Recorded Clips */}
                {recordedChunks.length > 0 && (
                    <div className="mt-2 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Recorded clips:</p>
                        <ul className="list-decimal list-inside space-y-1">
                            {recordedChunks.map((blob, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-center justify-between bg-gray-50 p-2 rounded">
                                    <span>Clip {index + 1} ({(blob.size / 1024).toFixed(1)} KB)</span>
                                    <div>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => playRecording(blob)}
                                            className="mr-1"
                                            icon={<Play className="h-4 w-4"/>}
                                        ><></></Button>
                                         <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => deleteRecording(index)}
                                            className="text-red-500 hover:text-red-700"
                                            icon={<Trash2 className="h-4 w-4"/>}
                                        ><></></Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {recordingError && (
                    <div className="flex items-center text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        {recordingError}
                    </div>
                )}
            </div>
        )}

        {/* Status/Error Messages (Common) */}
        {statusMessage && !error && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">{statusMessage}</div>
        )}
        {error && (
           <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
             <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
             {error}
           </div>
        )}

        {/* Submit Button (Common) */}
        <Button 
          type="submit" 
          variant="primary"
          className="w-full flex justify-center"
          disabled={isLoading || !voiceName.trim() || (inputMode === 'upload' && (!files || files.length === 0)) || (inputMode === 'record' && recordedChunks.length === 0)}
          icon={isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        >
          {isLoading ? 'Creating Voice...' : 'Create Voice Clone'}
        </Button>
      </form>
    </div>
  );
};

export default VoiceCloningForm; 