import { useState, useRef, useCallback, useEffect } from "react";

interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

type EndedHandler = (src: string) => void;

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef<EndedHandler | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
  });
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeat, setRepeat] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoadStart = () => setState((s) => ({ ...s, isLoading: true, error: null }));
    const onCanPlay = () => setState((s) => ({ ...s, isLoading: false }));
    const onTimeUpdate = () => setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () => setState((s) => ({ ...s, duration: audio.duration || 0 }));
    const onEnded = () => {
      if (repeat && audio.src) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));
      const src = audio.src;
      if (onEndedRef.current && src) onEndedRef.current(src);
    };
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
  }, [repeat]);

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
    audio.playbackRate = playbackRate;
    audio.play();
  }, [currentSrc, state.isPlaying, playbackRate]);

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

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const onEnded = useCallback((handler: EndedHandler | null) => {
    onEndedRef.current = handler;
  }, []);

  // Media Session API — lock-screen / OS-level controls
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", (d) => {
      if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - (d.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler("seekforward", (d) => {
      if (audioRef.current) audioRef.current.currentTime += d.seekOffset || 10;
    });
  }, []);

  const setMediaMetadata = useCallback((meta: { title: string; artist: string; album?: string }) => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album || "Al Bayani",
    });
  }, []);

  return {
    ...state,
    currentSrc,
    playbackRate,
    repeat,
    play,
    pause,
    toggle,
    seek,
    stop,
    setPlaybackRate,
    setRepeat,
    onEnded,
    setMediaMetadata,
  };
}
