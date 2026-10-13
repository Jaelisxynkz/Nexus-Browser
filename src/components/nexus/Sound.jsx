import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback } from "react";
import { useNexusSettings } from "./useNexusSettings";

/**
 * Nexus Sound Engine.
 *
 * - Synthesizes all UI sounds via the Web Audio API — no audio files needed.
 * - Every sound event maps to a tiny synthesized tone (pack-dependent).
 * - Sound packs change the waveform, envelope, and pitch character.
 * - Respects master volume, per-category toggles, and reduced-sound mode.
 * - Ambient audio tracks are also synthesized (drone + filtered noise loops).
 */

const SOUND_PACKS = {
  nexus: {
    label: "Nexus Default",
    wave: "sine",
    click: { freq: 880, dur: 0.04, gain: 0.08 },
    tabOpen: { freq: 660, dur: 0.08, sweep: 880, gain: 0.10 },
    tabClose: { freq: 440, dur: 0.08, sweep: 220, gain: 0.08 },
    tabSwitch: { freq: 720, dur: 0.04, gain: 0.06 },
    toggleOn: { freq: 1000, dur: 0.05, gain: 0.08 },
    toggleOff: { freq: 400, dur: 0.05, gain: 0.06 },
    success: { freq: 880, dur: 0.12, sweep: 1320, gain: 0.10 },
    error: { freq: 220, dur: 0.18, gain: 0.10 },
    notify: { freq: 740, dur: 0.10, sweep: 988, gain: 0.09 },
    search: { freq: 600, dur: 0.06, gain: 0.06 },
    bookmark: { freq: 988, dur: 0.08, gain: 0.08 },
    download: { freq: 523, dur: 0.10, sweep: 784, gain: 0.08 },
    startup: { freq: 330, dur: 0.4, sweep: 660, gain: 0.10 },
  },
  cyber: {
    label: "Cyber",
    wave: "sawtooth",
    click: { freq: 1200, dur: 0.03, gain: 0.06 },
    tabOpen: { freq: 880, dur: 0.06, sweep: 1320, gain: 0.08 },
    tabClose: { freq: 660, dur: 0.06, sweep: 330, gain: 0.07 },
    tabSwitch: { freq: 1000, dur: 0.03, gain: 0.05 },
    toggleOn: { freq: 1400, dur: 0.04, gain: 0.07 },
    toggleOff: { freq: 500, dur: 0.04, gain: 0.05 },
    success: { freq: 1000, dur: 0.10, sweep: 1600, gain: 0.08 },
    error: { freq: 180, dur: 0.16, gain: 0.09 },
    notify: { freq: 1100, dur: 0.08, sweep: 1400, gain: 0.07 },
    search: { freq: 900, dur: 0.05, gain: 0.05 },
    bookmark: { freq: 1320, dur: 0.06, gain: 0.06 },
    download: { freq: 700, dur: 0.08, sweep: 1100, gain: 0.07 },
    startup: { freq: 440, dur: 0.35, sweep: 880, gain: 0.09 },
  },
  minimal: {
    label: "Minimal",
    wave: "sine",
    click: { freq: 600, dur: 0.02, gain: 0.04 },
    tabOpen: { freq: 700, dur: 0.04, gain: 0.05 },
    tabClose: { freq: 500, dur: 0.04, gain: 0.04 },
    tabSwitch: { freq: 650, dur: 0.02, gain: 0.03 },
    toggleOn: { freq: 800, dur: 0.03, gain: 0.04 },
    toggleOff: { freq: 400, dur: 0.03, gain: 0.03 },
    success: { freq: 750, dur: 0.06, gain: 0.05 },
    error: { freq: 300, dur: 0.10, gain: 0.06 },
    notify: { freq: 680, dur: 0.06, gain: 0.05 },
    search: { freq: 580, dur: 0.04, gain: 0.04 },
    bookmark: { freq: 720, dur: 0.04, gain: 0.04 },
    download: { freq: 600, dur: 0.06, gain: 0.05 },
    startup: { freq: 440, dur: 0.25, gain: 0.06 },
  },
  deepspace: {
    label: "Deep Space",
    wave: "triangle",
    click: { freq: 440, dur: 0.06, gain: 0.07 },
    tabOpen: { freq: 392, dur: 0.12, sweep: 523, gain: 0.09 },
    tabClose: { freq: 349, dur: 0.12, sweep: 261, gain: 0.07 },
    tabSwitch: { freq: 466, dur: 0.05, gain: 0.06 },
    toggleOn: { freq: 587, dur: 0.06, gain: 0.07 },
    toggleOff: { freq: 311, dur: 0.06, gain: 0.05 },
    success: { freq: 523, dur: 0.18, sweep: 784, gain: 0.09 },
    error: { freq: 196, dur: 0.20, gain: 0.08 },
    notify: { freq: 494, dur: 0.12, sweep: 659, gain: 0.07 },
    search: { freq: 440, dur: 0.06, gain: 0.05 },
    bookmark: { freq: 523, dur: 0.08, gain: 0.06 },
    download: { freq: 392, dur: 0.10, sweep: 523, gain: 0.06 },
    startup: { freq: 261, dur: 0.5, sweep: 523, gain: 0.10 },
  },
  classic: {
    label: "Classic",
    wave: "square",
    click: { freq: 800, dur: 0.02, gain: 0.04 },
    tabOpen: { freq: 600, dur: 0.05, gain: 0.05 },
    tabClose: { freq: 400, dur: 0.05, gain: 0.04 },
    tabSwitch: { freq: 700, dur: 0.02, gain: 0.04 },
    toggleOn: { freq: 900, dur: 0.03, gain: 0.05 },
    toggleOff: { freq: 450, dur: 0.03, gain: 0.04 },
    success: { freq: 660, dur: 0.10, gain: 0.06 },
    error: { freq: 200, dur: 0.14, gain: 0.06 },
    notify: { freq: 740, dur: 0.08, gain: 0.05 },
    search: { freq: 620, dur: 0.04, gain: 0.04 },
    bookmark: { freq: 880, dur: 0.06, gain: 0.05 },
    download: { freq: 550, dur: 0.08, gain: 0.05 },
    startup: { freq: 392, dur: 0.30, gain: 0.06 },
  },
};

const AMBIENT_TRACKS = {
  deepspace: { label: "Deep Space", base: 110, filter: 800, q: 4, noise: 0.02 },
  cyber: { label: "Cyber", base: 220, filter: 1200, q: 6, noise: 0.03 },
  darkambient: { label: "Dark Ambient", base: 82, filter: 500, q: 3, noise: 0.04 },
  ocean: { label: "Ocean", base: 64, filter: 400, q: 2, noise: 0.08 },
  rain: { label: "Rain", base: 0, filter: 2000, q: 1, noise: 0.12 },
  nightcity: { label: "Night City", base: 146, filter: 900, q: 5, noise: 0.03 },
  focus: { label: "Focus", base: 196, filter: 600, q: 8, noise: 0.01 },
  calm: { label: "Calm", base: 130, filter: 500, q: 3, noise: 0.02 },
  futuristic: { label: "Futuristic", base: 174, filter: 1500, q: 7, noise: 0.02 },
};

// Which settings toggle gates each sound event
const EVENT_GATE = {
  click: "uiSounds",
  tabOpen: "tabSounds",
  tabClose: "tabSounds",
  tabSwitch: "tabSounds",
  toggleOn: "uiSounds",
  toggleOff: "uiSounds",
  success: "notificationSounds",
  error: "notificationSounds",
  notify: "notificationSounds",
  search: "navigationSounds",
  bookmark: "uiSounds",
  download: "notificationSounds",
  startup: "uiSounds",
};

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const { settings, update } = useNexusSettings();
  const audioRef = useRef(null);
  const masterGainRef = useRef(null);
  const ambientRef = useRef(null); // { oscillators, gain, noise, filter }

  // Lazily create AudioContext on first user gesture (browsers require it)
  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const master = ctx.createGain();
      master.gain.value = (settings.masterVolume || 0) / 100;
      master.connect(ctx.destination);
      audioRef.current = ctx;
      masterGainRef.current = master;
      return ctx;
    } catch {
      return null;
    }
  }, [settings.masterVolume]);

  // Update master volume live
  useEffect(() => {
    if (masterGainRef.current && audioRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        (settings.masterVolume || 0) / 100,
        audioRef.current.currentTime,
        0.05
      );
    }
  }, [settings.masterVolume]);

  // Ambient audio control
  useEffect(() => {
    const track = AMBIENT_TRACKS[settings.ambientTrack];
    const shouldPlay = settings.ambientAudio && track && !settings.reducedSound;
    if (shouldPlay) {
      ensureAudio();
      if (!audioRef.current) return;
      startAmbient();
    } else {
      stopAmbient();
    }
    return () => stopAmbient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.ambientAudio, settings.ambientTrack, settings.reducedSound, settings.ambientVolume]);

  function startAmbient() {
    if (ambientRef.current) return;
    const ctx = audioRef.current;
    if (!ctx) return;
    const track = AMBIENT_TRACKS[settings.ambientTrack];
    if (!track) return;
    const gain = ctx.createGain();
    gain.gain.value = ((settings.ambientVolume ?? 50) / 100) * 0.5;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = track.filter;
    filter.Q.value = track.q;
    gain.connect(filter);
    filter.connect(masterGainRef.current);
    const nodes = [];
    if (track.base > 0) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = track.base;
      osc.connect(gain);
      osc.start();
      nodes.push(osc);
      const osc2 = ctx.createOscillator();
      osc2.type = "triangle";
      osc2.frequency.value = track.base * 1.5;
      osc2.connect(gain);
      osc2.start();
      nodes.push(osc2);
    }
    // Noise component
    let noiseNode = null;
    if (track.noise > 0) {
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = track.noise;
      noise.connect(noiseGain);
      noiseGain.connect(gain);
      noise.start();
      noiseNode = { noise, noiseGain };
    }
    ambientRef.current = { nodes, gain, filter, noiseNode };
  }

  function stopAmbient() {
    if (!ambientRef.current) return;
    try {
      ambientRef.current.nodes.forEach((n) => { try { n.stop(); } catch {} });
      if (ambientRef.current.noiseNode?.noise) { try { ambientRef.current.noiseNode.noise.stop(); } catch {} }
    } catch {}
    ambientRef.current = null;
  }

  const play = useCallback((event) => {
    if (settings.reducedSound) return;
    const gate = EVENT_GATE[event];
    if (gate && !settings[gate]) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const pack = SOUND_PACKS[settings.soundPack] || SOUND_PACKS.nexus;
    const cfg = pack[event];
    if (!cfg) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = pack.wave;
    osc.frequency.setValueAtTime(cfg.freq, now);
    if (cfg.sweep) osc.frequency.linearRampToValueAtTime(cfg.sweep, now + cfg.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(cfg.gain, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + cfg.dur);
    osc.connect(g);
    g.connect(masterGainRef.current || ctx.destination);
    osc.start(now);
    osc.stop(now + cfg.dur + 0.02);
  }, [settings, ensureAudio]);

  const toggleMute = useCallback(() => {
    const next = !settings.reducedSound;
    update("reducedSound", next);
    return next;
  }, [settings.reducedSound, update]);

  const value = useMemo(() => ({
    play,
    toggleMute,
    muted: !!settings.reducedSound,
    packs: SOUND_PACKS,
    ambientTracks: AMBIENT_TRACKS,
  }), [play, toggleMute, settings.reducedSound]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  return useContext(SoundContext);
}

export { SOUND_PACKS, AMBIENT_TRACKS };