import axios from 'axios';

// Use the backend port defined in server.ts (default 3001)
// Renamed to reflect broader scope
const API_BASE_URL = 'http://localhost:3001/api'; 

// --- ElevenLabs Specific Interfaces ---
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

// Ensure Auth interfaces are exported
export interface AuthResponse {
    message: string;
    token: string;
    userId: string;
    email: string;
}

export interface RegisterResponse {
    message: string;
    userId: string;
}

// Helper function to get token from localStorage
const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

/**
 * Fetches the list of available voices from the backend.
 */
export const getVoices = async (): Promise<ElevenLabsVoice[]> => {
    const token = getAuthToken();
    // Note: This route is currently public on the backend, but adding token anyway for consistency
    // or if we decide to protect it later.
    const headers: Record<string, string> = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await axios.get<ElevenLabsVoice[]>(`${API_BASE_URL}/voices`, { headers });
        return response.data;
    } catch (error: any) {
        console.error('API Service Error (getVoices):', error.response?.data || error.message);
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('Unauthorized: Invalid or expired token.');
        }
        throw new Error(error.response?.data?.error || 'Failed to fetch voices');
    }
};

/**
 * Adds a new voice by uploading audio files.
 * Requires authentication.
 */
export const addVoice = async (formData: FormData): Promise<AddVoiceResponse> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    } else {
        // Should not happen if UI prevents call when logged out, but good failsafe
        throw new Error('Unauthorized: Authentication token not found.');
    }

    try {
        const response = await axios.post<AddVoiceResponse>(`${API_BASE_URL}/voices`, formData, { headers });
        return response.data;
    } catch (error: any) {
        console.error('API Service Error (addVoice):', error.response?.data || error.message);
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('Unauthorized: Cannot add voice.');
        }
        throw new Error(error.response?.data?.error || 'Failed to add voice');
    }
};

/**
 * Generates text-to-speech audio for a given voice ID and text.
 * Requires authentication.
 * Returns the raw audio Blob.
 */
export const generateTTS = async (
    voiceId: string, 
    text: string, 
    token: string | null, // Use THIS token passed as argument
    modelId?: string, 
    voiceSettings?: VoiceSettings
): Promise<Blob> => {
    const headers: Record<string, string> = {
        'Accept': 'audio/mpeg'
    };
    if (token) { // Use the argument token here
        headers.Authorization = `Bearer ${token}`;
    } else {
        // This error should ideally not be hit if App.tsx checks first,
        // but it's good fallback logic based on the passed token.
        throw new Error('Unauthorized: Authentication token not provided to generateTTS.');
    }

    try {
        const response = await axios.post(
            `${API_BASE_URL}/tts/${voiceId}`, 
            { 
                text, 
                ...(modelId && { model_id: modelId }), 
                ...(voiceSettings && { voice_settings: voiceSettings }) 
            },
            {
                responseType: 'blob',
                headers: headers // Headers now correctly use the argument token
            }
        );
        
        if (response.data instanceof Blob && response.data.type === 'audio/mpeg') {
            return response.data;
        } else {
            let errorMessage = 'Failed to generate TTS: Unexpected response format';
            try {
                if (response.data instanceof Blob) {
                    const errorText = await response.data.text();
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.error || errorJson.message || errorMessage;
                    } catch (jsonParseError) {
                        errorMessage = errorText || errorMessage;
                    }
                }
            } catch (blobReadError) {
                console.error("Error reading error blob:", blobReadError);
            }
            throw new Error(errorMessage);
        }
    } catch (error: any) {
        console.error('API Service Error (generateTTS):', error.response?.data || error.message);
        if (error.response?.status === 401 || error.response?.status === 403) {
            throw new Error('Unauthorized: Cannot generate TTS.');
        }
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

export const registerUser = async (email: string, password: string): Promise<RegisterResponse> => {
    // ... implementation ...
    try {
        const response = await axios.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, { email, password });
        return response.data;
    } catch (error: any) {
        console.error('API Service Error (registerUser):', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Registration failed');
    }
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
    // ... implementation ...
    try {
        const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, { email, password });
        return response.data;
    } catch (error: any) {
        console.error('API Service Error (loginUser):', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Login failed');
    }
}; 