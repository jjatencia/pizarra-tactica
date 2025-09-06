import { useState } from 'react';
import { useBoardStore } from '../hooks/useBoardStore';
import { SequenceRefinement } from './SequenceRefinement';
import { AnimationSequence } from '../types';

export function PlaybackControls() {
  const {
    playbackState,
    sequences,
    currentSequence,
    playSequence,
    pauseSequence,
    resumeSequence,
    stopSequence,
    setPlaybackSpeed,
    seekTo,
    removeSequence,
    addSequence,
  } = useBoardStore();

  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [showSequenceList, setShowSequenceList] = useState(false);
  const [originalDescriptions, setOriginalDescriptions] = useState<Record<string, string>>({});

  const handlePlay = () => {
    if (!selectedSequenceId && sequences.length > 0) {
      setSelectedSequenceId(sequences[0].id);
      playSequence(sequences[0].id);
    } else if (selectedSequenceId) {
      if (playbackState.isPaused) {
        resumeSequence();
      } else {
        playSequence(selectedSequenceId);
      }
    }
  };

  const handleSequenceSelect = (sequenceId: string) => {
    setSelectedSequenceId(sequenceId);
    setShowSequenceList(false);
  };

  const handleSequenceRefined = (newSequence: AnimationSequence, originalSequence: AnimationSequence) => {
    // Replace the old sequence with the refined one
    removeSequence(originalSequence.id);
    addSequence(newSequence);
    
    // Keep the original description for future refinements
    if (originalDescriptions[originalSequence.id]) {
      setOriginalDescriptions(prev => ({
        ...prev,
        [newSequence.id]: prev[originalSequence.id]
      }));
    }
    
    setSelectedSequenceId(newSequence.id);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const currentSequenceData = sequences.find(s => s.id === selectedSequenceId) || currentSequence;

  if (sequences.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-green-400">▶️</span>
          <span className="text-white font-medium">Reproductor de Secuencias</span>
        </div>
        
        {/* Sequence selector */}
        <div className="relative">
          <button
            onClick={() => setShowSequenceList(!showSequenceList)}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-500 transition-colors flex items-center gap-2"
          >
            {currentSequenceData?.title || 'Elegir secuencia'}
            <span className="text-xs">▼</span>
          </button>
          
          {showSequenceList && (
            <div className="absolute top-full right-0 mt-1 w-64 max-h-48 overflow-auto bg-slate-700 border border-slate-500 rounded shadow-lg z-50">
              {sequences.map(sequence => (
                <div key={sequence.id} className="border-b border-slate-600 last:border-0">
                  <button
                    onClick={() => handleSequenceSelect(sequence.id)}
                    className="w-full text-left p-2 hover:bg-slate-600 transition-colors"
                  >
                    <div className="text-sm text-white font-medium">{sequence.title}</div>
                    <div className="text-xs text-gray-400">{sequence.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTime(sequence.totalDuration)} · {sequence.steps.length} pasos
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSequence(sequence.id);
                      if (selectedSequenceId === sequence.id) {
                        setSelectedSequenceId('');
                      }
                    }}
                    className="absolute right-2 top-2 text-gray-400 hover:text-red-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause/Stop buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePlay}
            disabled={!selectedSequenceId}
            className="w-8 h-8 flex items-center justify-center bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded transition-colors"
            title={playbackState.isPaused ? 'Reanudar' : 'Reproducir'}
          >
            {playbackState.isPlaying ? '⏸️' : '▶️'}
          </button>
          
          {playbackState.isPlaying && (
            <button
              onClick={pauseSequence}
              className="w-8 h-8 flex items-center justify-center bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors"
              title="Pausar"
            >
              ⏸️
            </button>
          )}
          
          <button
            onClick={stopSequence}
            disabled={!playbackState.isPlaying && !playbackState.isPaused}
            className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white rounded transition-colors"
            title="Parar"
          >
            ⏹️
          </button>
        </div>

        {/* Progress bar */}
        {currentSequenceData && (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {formatTime(playbackState.currentTime)}
            </span>
            
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max={currentSequenceData.totalDuration}
                value={playbackState.currentTime}
                onChange={(e) => seekTo(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${(playbackState.currentTime / currentSequenceData.totalDuration) * 100}%, #475569 ${(playbackState.currentTime / currentSequenceData.totalDuration) * 100}%, #475569 100%)`
                }}
              />
            </div>
            
            <span className="text-xs text-gray-400">
              {formatTime(currentSequenceData.totalDuration)}
            </span>
          </div>
        )}

        {/* Speed control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Velocidad:</span>
          <select
            value={playbackState.speed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="text-xs bg-slate-700 border border-slate-500 text-white rounded px-2 py-1"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>

      {/* Sequence info */}
      {currentSequenceData && (
        <div className="text-xs text-gray-400 border-t border-slate-600 pt-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-medium text-gray-300">{currentSequenceData.title}</div>
              <div>{currentSequenceData.description}</div>
            </div>
            
            {/* Refinement button */}
            <SequenceRefinement
              sequence={currentSequenceData}
              originalDescription={originalDescriptions[currentSequenceData.id] || currentSequenceData.description}
              onSequenceRefined={(newSequence) => handleSequenceRefined(newSequence, currentSequenceData)}
              onError={(error) => console.error(error)} // You might want to pass this up to the parent
            />
          </div>
          
          {playbackState.isPlaying && (
            <div className="mt-1 text-green-400">
              ⏯️ Reproduciendo...
            </div>
          )}
          {currentSequenceData.questions && currentSequenceData.questions.length > 0 && (
            <div className="mt-2 p-2 bg-amber-900/30 border border-amber-600/30 rounded text-amber-200">
              <div className="font-medium">La IA tiene preguntas:</div>
              <ul className="list-disc list-inside">
                {currentSequenceData.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}