import { API_URL } from '../constants';

class ElevenLabsService {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    // Store in sessionStorage to persist during the session
    // (would use a more secure approach in production)
    sessionStorage.setItem('elevenlabs_api_key', key);
  }

  getApiKey(): string | null {
    // Return in-memory key if already set
    if (this.apiKey) {
      return this.apiKey;
    }
    // Try sessionStorage
    const stored = sessionStorage.getItem('elevenlabs_api_key');
    if (stored) {
      this.apiKey = stored;
      return this.apiKey;
    }
    // Fallback to environment variable (VITE_ELEVENLABS_API_KEY)
    const envKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    if (envKey) {
      this.apiKey = envKey;
      return this.apiKey;
    }
    return null;
  }

  async getVoices() {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    try {
      const response = await fetch(`${API_URL}/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Error fetching voices: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching voices:', error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceId: string) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    try {
      const response = await fetch(`${API_URL}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Error generating speech: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }
}

export default new ElevenLabsService();