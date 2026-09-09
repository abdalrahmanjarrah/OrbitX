import { create } from 'zustand';

interface IntroState {
  scrollProgress: number;
  activeScreen: number;
  doorOpen: boolean;
  showSolarSystem: boolean;
  isMuted: boolean;
  introComplete: boolean;
  setScrollProgress: (p: number) => void;
  setActiveScreen: (s: number) => void;
  setDoorOpen: (v: boolean) => void;
  setShowSolarSystem: (v: boolean) => void;
  toggleMute: () => void;
  setIntroComplete: (v: boolean) => void;
}

export const useIntroStore = create<IntroState>((set) => ({
  scrollProgress: 0,
  activeScreen: -1,
  doorOpen: false,
  showSolarSystem: false,
  isMuted: true,
  introComplete: false,
  setScrollProgress: (p) => set({ scrollProgress: p }),
  setActiveScreen: (s) => set({ activeScreen: s }),
  setDoorOpen: (v) => set({ doorOpen: v }),
  setShowSolarSystem: (v) => set({ showSolarSystem: v }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setIntroComplete: (v) => set({ introComplete: v }),
}));
