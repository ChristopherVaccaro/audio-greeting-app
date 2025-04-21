import axios from 'axios';

// Use the backend port defined in server.ts (default 3001)
const API_BASE_URL = 'http://localhost:3001/api';

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    category?: string;
    // Add other relevant fields from the ElevenLabs API if needed
    labels?: Record<string, string>;
    description?: string;
    preview_url?: string;
}

export interface AddVoiceResponse {
    voice_id: string;
    name: string;
}

export interface VoiceSettings {
    stability: number;
    similarity_boost: number;
    style?: number;         // Optional: For models supporting style exaggeration
    use_speaker_boost?: boolean; // Optional: For models supporting speaker boost
}

/**
 * Fetches the list of available voices from the backend.
 */
export const getVoices = async (): Promise<ElevenLabsVoice[]> => {
    try {
        const response = await axios.get<ElevenLabsVoice[]>(`${API_BASE_URL}/voices`);
        return response.data;
    } catch (error: any) {
        console.error('API Service Error (getVoices):', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Failed to fetch voices');
    }
};

/**
 * Adds a new voice by uploading audio files.
 * @param formData - FormData object containing 'files' (File objects) and 'name' (string).
 */
export const addVoice = async (formData: FormData): Promise<AddVoiceResponse> => {
    try {
        const response = await axios.post<AddVoiceResponse>(`${API_BASE_URL}/voices`, formData, {
            headers: {
                // Content-Type is set automatically by browser for FormData
            },
        });
        return response.data;
    } catch (error: any) {
        console.error('API Service Error (addVoice):', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Failed to add voice');
    }
};

/**
 * Generates text-to-speech audio for a given voice ID and text.
 * Returns the raw audio Blob.
 */
export const generateTTS = async (
    voiceId: string, 
    text: string, 
    modelId?: string, // Optional: specify model e.g., 'eleven_multilingual_v2'
    voiceSettings?: VoiceSettings // Optional: fine-tune voice generation
): Promise<Blob> => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/tts/${voiceId}`, 
            { 
                text, 
                ...(modelId && { model_id: modelId }), 
                ...(voiceSettings && { voice_settings: voiceSettings }) 
            },
            {
                responseType: 'blob', // Important: We want the raw audio data as a Blob
                headers: {
                    'Accept': 'audio/mpeg', // Let the server know we expect mp3
                }
            }
        );
        
        if (response.data instanceof Blob && response.data.type === 'audio/mpeg') {
            return response.data;
        } else {
             // If the response wasn't the expected blob (e.g., server sent JSON error)
             console.error('API Service Error (generateTTS): Expected audio/mpeg Blob, received:', response.data);
             // Try to parse as JSON error if possible
             let errorMessage = 'Failed to generate TTS: Unexpected response format';
             try {
                // Blobs need to be read asynchronously
                if (response.data instanceof Blob) {
                     const errorText = await response.data.text();
                     try {
                         const errorJson = JSON.parse(errorText);
                         errorMessage = errorJson.error || errorJson.message || errorMessage;
                     } catch (jsonParseError) {
                         errorMessage = errorText || errorMessage; // Use raw text if not JSON
                     }
                }
             } catch (blobReadError) {
                 console.error("Error reading error blob:", blobReadError);
             }
            throw new Error(errorMessage);
        }

    } catch (error: any) {
        console.error('API Service Error (generateTTS):', error.response?.data || error.message);
        // Attempt to read error details if the response was a blob (e.g., error from server)
        if (error.response?.data instanceof Blob) {
            try {
                const errorText = await error.response.data.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || errorJson.message || 'Failed to generate TTS');
                } catch (jsonParseError) {
                    throw new Error(errorText || 'Failed to generate TTS: Non-JSON error response');
                }
            } catch (blobReadError) {
                 throw new Error('Failed to generate TTS and could not read error details.');
            }
        } else {
            throw new Error(error.response?.data?.error || 'Failed to generate TTS');
        }
    }
}; 