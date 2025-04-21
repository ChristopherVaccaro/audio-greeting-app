import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, Download } from 'lucide-react';
import Button from './Button';

type AudioPlayerProps = {
  audioUrl: string | null;
  isGenerating: boolean;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, isGenerating }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Refs for audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Helper to ensure AudioContext exists and is resumed
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log("AudioContext created.");
      } catch (e) {
        console.error("Error creating AudioContext:", e);
        return null;
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.error("Error resuming AudioContext:", e));
    }
    return audioContextRef.current;
  }, []);

  // Effect 1: Basic audio element event listeners & state reset
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      // Optional: Reset currentTime to allow replaying from start easily
      // audio.currentTime = 0; 
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Reset state when audioUrl changes
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);

    // Cleanup listeners and pause audio
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [audioUrl]); // Runs only when audioUrl changes

  // Effect 2: Audio node setup (triggered by audio readiness)
  useEffect(() => {
    const audio = audioRef.current;
    // Exit if no audio element or URL
    if (!audio || !audioUrl) {
       // Ensure nodes are disconnected if element/URL is removed
       if (sourceRef.current) sourceRef.current.disconnect();
       if (analyserRef.current) analyserRef.current.disconnect();
       sourceRef.current = null;
       analyserRef.current = null;
       return;
    }

    const setupAudioNodes = () => {
      const audioContext = ensureAudioContext();
      if (!audioContext) return; // Stop if context failed

      // Prevent re-setup if source already exists for this element/context
      if (sourceRef.current) {
          console.log("Audio nodes already set up.");
          return;
      }

      console.log("Attempting to create and connect audio nodes...");
      try {
        sourceRef.current = audioContext.createMediaElementSource(audio);
        analyserRef.current = audioContext.createAnalyser();
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
        analyserRef.current.fftSize = 256;
        console.log("Audio nodes created and connected successfully.");
      } catch (error) {
        console.error("Error setting up audio nodes:", error);
        // Clean up refs on error
        if (sourceRef.current) sourceRef.current.disconnect();
        if (analyserRef.current) analyserRef.current.disconnect();
        sourceRef.current = null;
        analyserRef.current = null;
      }
    };

    // Use 'canplaythrough' event to ensure the element is ready
    const handleCanPlayThrough = () => {
      console.log("'canplaythrough' event fired.");
      setupAudioNodes();
    };

    // Check if audio is already ready
    if (audio.readyState >= 4) { // HAVE_ENOUGH_DATA
      console.log("Audio readyState >= 4, setting up nodes immediately.");
      setupAudioNodes();
    } else {
      console.log(`Audio not ready (readyState: ${audio.readyState}), adding 'canplaythrough' listener.`);
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
    }

    // Cleanup function for this effect
    return () => {
      console.log("Cleaning up node setup effect for:", audioUrl);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough); // Remove listener

      // Disconnect nodes when audioUrl changes or component unmounts
      if (sourceRef.current) {
        console.log("Disconnecting source node.");
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        console.log("Disconnecting analyser node.");
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
    };
    // Rerun when audioUrl changes or the context helper potentially changes (though stable due to useCallback)
  }, [audioUrl, ensureAudioContext]);

  // Effect 3: Visualization rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current; // Get current analyser ref

    // Conditions to *not* run the animation: no canvas, no analyser, or not playing
    if (!canvas || !analyser || !isPlaying) {
        // Ensure any previous animation is cancelled
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = undefined;
        }
        // Optional: Clear canvas or draw an inactive state when not animating
        if (canvas) { 
          const canvasCtx = canvas.getContext('2d');
          if (canvasCtx) { // Check context was obtained
              canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
              // Draw a flat line for inactive state
              canvasCtx.beginPath();
              canvasCtx.moveTo(0, canvas.height / 2);
              canvasCtx.lineTo(canvas.width, canvas.height / 2);
              canvasCtx.strokeStyle = '#A5B4FC'; // Lighter indigo
              canvasCtx.lineWidth = 1;
              canvasCtx.stroke();
          }
        }
        return; // Stop the effect here
    }

    // Setup for rendering
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return; // Should have canvas context if canvas exists

    let isActive = true; // Flag to control the loop persistence

    const renderFrame = () => {
        // Stop if no longer active, analyser disconnected, or not playing
        if (!isActive || !analyserRef.current || !isPlaying) {
            animationRef.current = undefined;
            return;
        }

        animationRef.current = requestAnimationFrame(renderFrame);

        // Get data and draw
        analyserRef.current.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            const hue = 240 - (dataArray[i] / 255) * 60;
            canvasCtx.fillStyle = `hsl(${hue}, 70%, 60%)`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };

    renderFrame(); // Start the animation

    // Cleanup function for this effect instance
    return () => {
      console.log("Cleaning up animation frame.");
      isActive = false; // Signal loop to stop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
    // Rerun when isPlaying changes or the analyser instance potentially changes
  }, [isPlaying, analyserRef]);


  // Effect 4: Unmount cleanup for AudioContext
  useEffect(() => {
    return () => {
      console.log("AudioPlayer unmounting. Closing AudioContext.");
      // Nodes disconnected by Effect 2 cleanup. Close the context.
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(e => console.error("Error closing AudioContext on unmount:", e));
      }
      audioContextRef.current = null;
    };
  }, []); // Empty dependency array: runs only on unmount

  // Toggle Play/Pause handler
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    const analyser = analyserRef.current; // Check if analyser is ready
    const source = sourceRef.current;     // Check if source is ready

    // Exit if essential elements/nodes aren't ready
    if (!audio || !audioUrl || !analyser || !source) {
        console.warn("Cannot toggle play/pause: Audio element or nodes not ready.");
        // Optionally try ensuring context here, but node setup effect should handle it
        // ensureAudioContext();
        return;
    }

    // Ensure context is running (important for resuming playback after pause/suspension)
    const audioContext = ensureAudioContext();
    if (!audioContext) {
         console.error("Cannot toggle play/pause: AudioContext not available.");
         return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(e => {
          console.error("Error playing audio:", e);
          setIsPlaying(false); // Reset state on error
        });
    }
  }, [isPlaying, audioUrl, ensureAudioContext]); // Dependencies

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'audio-greeting.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Conditional rendering for loading/generated states
  if (!audioUrl) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
        {isGenerating ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Generating your audio greeting...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Volume2 className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">Preview your audio greeting after generation</p>
          </div>
        )}
      </div>
    );
  }

  // Main player UI
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" preload="metadata"/>
      
      <div className="mb-4">
        <canvas 
          ref={canvasRef} 
          width="600" 
          height="100"
          className="w-full h-[100px] rounded-md bg-gray-50"
        />
      </div>
      
      <div className="flex items-center mb-3">
        <Button 
          onClick={togglePlayPause} 
          variant="primary"
          icon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          // Disable button briefly if nodes aren't ready? Might be complex UX.
          // disabled={!sourceRef.current || !analyserRef.current} 
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        
        <Button 
          onClick={handleDownload}
          variant="outline" 
          className="ml-3"
          icon={<Download className="h-4 w-4" />}
        >
          Download
        </Button>
        
        <div className="ml-auto text-sm text-gray-500">
          {formatTime(progress)} / {formatTime(duration || 0)}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-100"
          style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
        ></div>
      </div>
    </div>
  );
};

export default AudioPlayer;