import { useState, useRef, useCallback, useEffect } from "react";

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
  });
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoadStart = () => setState((s) => ({ ...s, isLoading: true, error: null }));
    const onCanPlay = () => setState((s) => ({ ...s, isLoading: false }));
    const onTimeUpdate = () => setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () => setState((s) => ({ ...s, duration: audio.duration || 0 }));
    const onEnded = () => setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));
    const onError = () => setState((s) => ({ ...s, isLoading: false, error: "Failed to load audio" }));
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));

    audio.addEventListener("loadstart", onLoadStart);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("loadstart", onLoadStart);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const play = useCallback((url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentSrc === url && !state.isPlaying) {
      audio.play();
      return;
    }
    if (currentSrc !== url) {
      audio.src = url;
      setCurrentSrc(url);
    }
    audio.play();
  }, [currentSrc, state.isPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback((url: string) => {
    if (currentSrc === url && state.isPlaying) {
      pause();
    } else {
      play(url);
    }
  }, [currentSrc, state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio && isFinite(time)) {
      audio.currentTime = time;
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setCurrentSrc(null);
      setState((s) => ({ ...s, isPlaying: false, currentTime: 0, duration: 0 }));
    }
  }, []);

  return { ...state, currentSrc, play, pause, toggle, seek, stop };
}
