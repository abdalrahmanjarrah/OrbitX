/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Music,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  VolumeX,
  Volume2,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { useLanguage } from "../context/LanguageContext";
import { SURAHS, RECITERS } from '../shared';

class InterstellarSynthEngine {
  private ctx: AudioContext | null = null;
  public isPlaying: boolean = false;
  private timeoutId: any = null;
  private activeOscillators: { stop: () => void }[] = [];
  private step = 0;
  private mainGain: GainNode | null = null;
  private volumeValue = 0.6;

  constructor() {}

  setVolume(vol: number) {
    this.volumeValue = vol;
    if (this.mainGain && this.ctx) {
      this.mainGain.gain.setValueAtTime(vol * 0.15, this.ctx.currentTime);
    }
  }

  start(onPlayBeat?: (step: number) => void) {
    if (this.isPlaying) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    try {
      this.ctx = new AudioContextClass();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isPlaying = true;
      this.step = 0;
      
      this.mainGain = this.ctx.createGain();
      this.mainGain.gain.setValueAtTime(this.volumeValue * 0.15, this.ctx.currentTime);
      
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = 0.45;
      
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.35;
      
      this.mainGain.connect(this.ctx.destination);
      this.mainGain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.ctx.destination);

      const playLoop = () => {
        if (!this.isPlaying || !this.ctx) return;

        const tempo = 85; 
        const stepDuration = 60 / tempo; 
        const currentStep = this.step;

        const measure = Math.floor(currentStep / 8) % 4;
        const beatInMeasure = currentStep % 8;

        let highNote = 659.25; 
        if (measure === 0 || measure === 2) {
          highNote = (beatInMeasure % 2 === 0) ? 659.25 : 783.99; 
        } else {
          highNote = (beatInMeasure % 2 === 0) ? 659.25 : 698.46; 
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(highNote, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + stepDuration * 1.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.mainGain);

        try {
          osc.start();
          osc.stop(this.ctx.currentTime + stepDuration * 1.8);
          this.activeOscillators.push({ stop: () => { try { osc.stop(); } catch(e){} } });
        } catch (e) {}

        if (beatInMeasure === 0) {
          let bassFreq = 110.0; 
          if (measure === 1) bassFreq = 82.41; 
          if (measure === 2) bassFreq = 87.31; 
          if (measure === 3) bassFreq = 130.81; 

          const sub = this.ctx.createOscillator();
          const subGain = this.ctx.createGain();
          const subFilter = this.ctx.createBiquadFilter();

          sub.type = 'sine';
          sub.frequency.setValueAtTime(bassFreq, this.ctx.currentTime);

          subFilter.type = 'lowpass';
          subFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

          subGain.gain.setValueAtTime(0, this.ctx.currentTime);
          subGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.5);
          subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + stepDuration * 7.5);

          sub.connect(subFilter);
          subFilter.connect(subGain);
          subGain.connect(this.mainGain);

          try {
            sub.start();
            sub.stop(this.ctx.currentTime + stepDuration * 8);
            this.activeOscillators.push({ stop: () => { try { sub.stop(); } catch(e){} } });
          } catch (e) {}

          const swell = this.ctx.createOscillator();
          const swellGain = this.ctx.createGain();
          
          swell.type = 'triangle';
          swell.frequency.setValueAtTime(bassFreq * 1.5, this.ctx.currentTime); 

          swellGain.gain.setValueAtTime(0, this.ctx.currentTime);
          swellGain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 1.2);
          swellGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + stepDuration * 7.0);

          swell.connect(swellGain);
          swellGain.connect(this.mainGain);

          try {
            swell.start();
            swell.stop(this.ctx.currentTime + stepDuration * 8);
            this.activeOscillators.push({ stop: () => { try { swell.stop(); } catch(e){} } });
          } catch (e) {}
        }

        if (onPlayBeat) {
          onPlayBeat(currentStep);
        }

        this.step++;
        this.timeoutId = setTimeout(playLoop, stepDuration * 1000);
      };

      playLoop();
    } catch (err) {
      console.error("Synthesizer initialization failed", err);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.activeOscillators = [];
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
    this.mainGain = null;
  }
}

export default function QuranPlayer() {
  const [reciterIndex, setReciterIndex] = useState(0);
  const [surahIndex, setSurahIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [isOpen, setIsOpen] = useState(false);
  
  // Custom Space soundtrack integration
  const [audioMode, setAudioMode] = useState<"quran" | "interstellar">("quran");
  const [interstellarType, setInterstellarType] = useState<"original" | "synth">("original");
  const [synthStep, setSynthStep] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const synthEngineRef = useRef<InterstellarSynthEngine | null>(null);
  const { isAr } = useLanguage();

  // Initialize synth engine lazily
  if (!synthEngineRef.current) {
    synthEngineRef.current = new InterstellarSynthEngine();
  }

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    if (synthEngineRef.current) {
      synthEngineRef.current.setVolume(volume);
    }
  }, [volume]);

  // Handle reloading audio when mode or index changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioMode, surahIndex, reciterIndex]);

  // Clean up synth engine on unmount
  useEffect(() => {
    return () => {
      if (synthEngineRef.current) {
        synthEngineRef.current.stop();
      }
    };
  }, []);

  const handleModeChange = async (mode: "quran" | "interstellar") => {
    if (synthEngineRef.current) {
      synthEngineRef.current.stop();
    }
    if (audioRef.current) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setAudioMode(mode);
  };

  const handleInterstellarTypeChange = async (type: "original" | "synth") => {
    if (synthEngineRef.current) {
      synthEngineRef.current.stop();
    }
    if (audioRef.current) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setInterstellarType(type);
  };

  const togglePlay = async () => {
    if (audioMode === "interstellar" && interstellarType === "synth") {
      const engine = synthEngineRef.current;
      if (!engine) return;

      if (isPlaying) {
        engine.stop();
        setIsPlaying(false);
      } else {
        engine.stop(); // safety check
        engine.start((step) => {
          setSynthStep(step);
        });
        setIsPlaying(true);
      }
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        if (synthEngineRef.current) {
          synthEngineRef.current.stop();
        }
        playPromiseRef.current = audioRef.current.play();
        setIsPlaying(true);
        await playPromiseRef.current;
      } catch (e) {
        console.error("Audio play failed", e);
        setIsPlaying(false);
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const handleSurahChange = async (index: number) => {
    setSurahIndex(index);
    setIsPlaying(false);
    if (audioRef.current) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  const handleReciterChange = async (index: number) => {
    setReciterIndex(index);
    setIsPlaying(false);
    if (audioRef.current) {
      if (playPromiseRef.current) {
        await playPromiseRef.current.catch(() => {});
      }
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  const getAudioUrl = () => {
    if (audioMode === "interstellar") {
      return "https://archive.org/download/interstellar-theme/Interstellar%20-%20Main%2520Theme%20-%20Hans%2520Zimmer.mp3";
    }
    const surahNum = (surahIndex + 1).toString().padStart(3, "0");
    return `${RECITERS[reciterIndex].server}${surahNum}.mp3`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-24 ltr:left-6 rtl:right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl",
          isOpen
            ? "bg-indigo-600 text-white shadow-indigo-900/50"
            : "bg-space-dark border border-white/10 hover:bg-white/5 shadow-black/50",
        )}
        title="القرآن الكريم"
      >
        <Music
          size={20}
          className={cn(
            !isOpen &&
              "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]",
          )}
        />
        {isPlaying && !isOpen && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_rgba(99,102,241,0.8)] border-2 border-[#0a0b16]" />
        )}
      </button>

      <audio
        ref={audioRef}
        src={getAudioUrl()}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.removeAttribute("src");
            audioRef.current.load();
          }
        }}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            className="fixed bottom-[130px] ltr:left-6 rtl:right-6 z-50 w-80 max-w-[calc(100vw-2rem)] bg-gradient-to-br from-[#0c0c16]/95 to-[#050510]/95 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl shadow-indigo-900/40"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-space-dark/80 shrink-0">
              <div className="flex items-center gap-2">
                <Music
                  size={18}
                  className="text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                />
                <h3 className="font-bold text-right text-sm tracking-wide text-white">
                  القرآن الكريم 🕌
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={reciterIndex}
                    onChange={(e) =>
                      handleReciterChange(parseInt(e.target.value))
                    }
                    className="w-full bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 rounded-xl px-4 py-2.5 text-right text-sm appearance-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-gray-200"
                  >
                    {RECITERS.map((r, i) => (
                      <option
                        key={i}
                        value={i}
                        className="bg-space-dark text-white"
                      >
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>

                <div className="relative">
                  <select
                    value={surahIndex}
                    onChange={(e) =>
                      handleSurahChange(parseInt(e.target.value))
                    }
                    className="w-full bg-space-dark shadow-lg shadow-indigo-900/10 border border-white/10 rounded-xl px-4 py-2.5 text-right text-sm appearance-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-gray-200"
                  >
                    {SURAHS.map((s, i) => (
                      <option
                        key={i}
                        value={i}
                        className="bg-space-dark text-white"
                      >
                        {s} .{i + 1}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 py-4 bg-white/[0.02] rounded-2xl border border-white/5">
                <SkipBack
                  size={20}
                  className="text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSurahChange(Math.max(0, surahIndex - 1))}
                />
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/30"
                >
                  {isPlaying ? (
                    <Pause size={24} fill="white" />
                  ) : (
                    <Play size={24} fill="white" className="ml-1" />
                  )}
                </button>
                <SkipForward
                  size={20}
                  className="text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() =>
                    handleSurahChange(
                      Math.min(SURAHS.length - 1, surahIndex + 1),
                    )
                  }
                />
              </div>

              <div className="space-y-1 px-2 pt-2 pb-1">
                <div className="flex items-center gap-3">
                  <VolumeX size={16} className="text-gray-500" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-400 hover:accent-indigo-300 transition-colors"
                  />
                  <Volume2 size={16} className="text-gray-500" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
