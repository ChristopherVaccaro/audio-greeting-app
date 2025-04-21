import React, { useEffect, useRef, useState } from 'react';
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
  
  // Keep references to audio context and nodes to prevent recreating them
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!canvasRef.current || !audioRef.current || !audioUrl) return;
    
    // Clean up previous audio nodes if they exist
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    
    // Create or reuse AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Setup audio visualization
    const audio = audioRef.current;
    const audioContext = audioContextRef.current;
    
    // Create new nodes
    analyserRef.current = audioContext.createAnalyser();
    sourceRef.current = audioContext.createMediaElementSource(audio);
    
    // Connect the nodes
    sourceRef.current.connect(analyserRef.current);
    analyserRef.current.connect(audioContext.destination);
    
    const analyser = analyserRef.current;
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;
    
    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      // Only draw visualization when playing
      if (isPlaying) {
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          
          // Gradient for bars - cool blue/purple when quiet, warm when loud
          const hue = 240 - (dataArray[i] / 255) * 60; 
          canvasCtx.fillStyle = `hsl(${hue}, 70%, 60%)`;
          
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      } else {
        // Draw a simple flat line when not playing
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.strokeStyle = '#6366F1';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
      }
    };
    
    renderFrame();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Disconnect audio nodes
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
    };
  }, [audioUrl, isPlaying]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <audio ref={audioRef} src={audioUrl} />
      
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
          {formatTime(progress)} / {formatTime(duration)}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-100"
          style={{ width: `${(progress / duration) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default AudioPlayer;