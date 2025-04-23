import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, RefreshCw, Download, Loader2 } from 'lucide-react';
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

  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Reset state when audioUrl changes or generation starts
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    setIsLoadingMetadata(!!audioUrl); // Start loading if new URL

    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load(); // Important to load the new source
    } else if (audioRef.current) {
      audioRef.current.removeAttribute('src'); // Clear src if URL is null
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Handle metadata loading
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
        setIsLoadingMetadata(false);
        setError(null);
        console.log(`Audio metadata loaded: Duration=${audio.duration}`);
      } else {
        // Sometimes duration is Infinity initially
        console.warn('Audio duration is Infinity initially, will retry on durationchange.');
      }
    };
    const handleDurationChange = () => {
       if (isFinite(audio.duration) && audio.duration > 0) {
         setDuration(audio.duration);
         setIsLoadingMetadata(false);
         setError(null);
         console.log(`Audio duration changed: Duration=${audio.duration}`);
       } 
    };

    const handleError = (e: Event) => {
      console.error("Audio Error:", audio.error);
      setError(`Error loading audio: ${audio.error?.message || 'Unknown error'}`);
      setIsLoadingMetadata(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]); // Rerun when URL changes

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

  // Effect 5: Sync playback progress and state with audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setProgress(audio.currentTime);
    };
    const onPlay = () => {
      setIsPlaying(true);
    };
    const onPause = () => {
      setIsPlaying(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // Toggle Play/Pause handler
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl || isGenerating || isLoadingMetadata || !!error) return;

    // Helper functions to play and pause audio with state updates
    const playAudio = () => {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.error("Error playing audio:", e));
    };
    const pauseAudio = () => {
      audio.pause();
      setIsPlaying(false);
    };

    // Ensure AudioContext is active before playback
    const context = ensureAudioContext();
    if (context && context.state === 'suspended') {
      context.resume()
        .then(() => {
          if (audio.paused) {
            playAudio();
          } else {
            pauseAudio();
          }
        })
        .catch(e => console.error("Error resuming AudioContext:", e));
    } else {
      if (audio.paused) {
        playAudio();
      } else {
        pauseAudio();
      }
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setProgress(audio.currentTime);
    }
  };
  
  // Add handleSeek function
  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.duration)) {
      const seekTime = Number(event.target.value);
      audio.currentTime = seekTime;
      setProgress(seekTime); // Update progress state immediately
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    // Optionally reset progress to 0 or keep it at the end
    // setProgress(0);
    // audioRef.current?.load(); // Reset for re-play if desired
  };

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
  if (isGenerating) {
    return (
      <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Generating audio...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600/50 flex items-center justify-center h-40 text-center">
         <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center h-40 text-center">
        <span className="text-gray-500 dark:text-gray-400">No audio generated yet.</span>
      </div>
    );
  }
  
  if (isLoadingMetadata) {
    return (
      <div className="p-6 rounded-lg bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 flex items-center justify-center h-40">
         <Loader2 className="h-6 w-6 text-gray-500 dark:text-gray-400 animate-spin" />
         <span className="ml-3 text-gray-500 dark:text-gray-400">Loading audio...</span>
      </div>
    );
  }

  // Main player UI
  return (
    <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" preload="metadata"/>
      
      <div className="mb-4">
        <canvas 
          ref={canvasRef} 
          width="600" 
          height="100"
          className="w-full h-[100px] rounded-md bg-gray-50"
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <Button 
          onClick={togglePlayPause} 
          disabled={!audioUrl || isGenerating || isLoadingMetadata || !!error}
          variant="ghost"
          size="sm"
          className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:text-gray-400 dark:disabled:text-gray-600"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>

        <div className="flex-grow">
          <input 
            type="range"
            min="0"
            max={duration || 1} // Use 1 if duration is 0 to prevent errors
            value={progress}
            onChange={handleSeek}
            disabled={!audioUrl || isGenerating || isLoadingMetadata || !!error || duration === 0}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-right">
         {formatTime(progress)} / {formatTime(duration)}
      </div>

      <Button 
        onClick={handleDownload}
        disabled={!audioUrl || isGenerating || isLoadingMetadata || !!error}
        variant="outline"
        size="sm"
        icon={<Download className="h-4 w-4" />}
        className="mt-4 w-full sm:w-auto"
      >
        Download Audio
      </Button>
    </div>
  );
};

export default AudioPlayer;