import { useState, useEffect, useRef, useCallback } from "react";

export interface VoiceRecorderState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  durationSeconds: number;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setManualTranscript: (text: string) => void;
}

export function useVoiceRecorder(): VoiceRecorderState {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechRecognition));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please type or paste your debrief notes.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-AU";

      recognition.onstart = () => {
        setIsListening(true);
        setDurationSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setDurationSeconds((s) => s + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let currentFinal = "";
        let currentInterim = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            currentFinal += res[0].transcript + " ";
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${currentFinal.trim()}` : currentFinal.trim()));
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn("[useVoiceRecorder] error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone permission was denied. Please allow microphone access or use manual input.");
        } else if (event.error !== "no-speech") {
          setError(`Speech recognition notice: ${event.error}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("[useVoiceRecorder] start error:", err);
      setError("Failed to initialize microphone.");
      setIsListening(false);
    }
  }, [stopListening]);

  const resetTranscript = useCallback(() => {
    stopListening();
    setTranscript("");
    setInterimTranscript("");
    setDurationSeconds(0);
    setError(null);
  }, [stopListening]);

  const setManualTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    durationSeconds,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setManualTranscript
  };
}
