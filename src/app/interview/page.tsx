'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { useToast } from '@/components/ui/Toast';
import {
  Play,
  History,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  MessageSquare,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle,
  RotateCcw,
  AlertCircle,
  Award,
  ShieldCheck,
  UserCheck,
  Send,
  Keyboard,
  Radio,
  Sliders,
} from 'lucide-react';
import type { InterviewSession, JobMatch } from '@/lib/types';

// Distinct modes
type InterviewMode = 'typing' | 'video';

// Distinct states for Video Interview
type VideoCallStatus =
  | 'RINGING'
  | 'AI_SPEAKING'
  | 'USER_TURN'
  | 'RECORDING'
  | 'PROCESSING'
  | 'AI_THINKING';

export default function InterviewPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [interviewType, setInterviewType] = useState<'hr' | 'technical'>('hr');

  // Mode Selection: 'typing' vs 'video'
  const [selectedMode, setSelectedMode] = useState<InterviewMode>('video');
  const [activeScreen, setActiveScreen] = useState<'setup' | 'typing_session' | 'video_session' | 'ended'>('setup');

  // Typing Mode State
  const [typingInput, setTypingInput] = useState('');
  const [typingLoading, setTypingLoading] = useState(false);

  // Video Mode State
  const [videoStatus, setVideoStatus] = useState<VideoCallStatus>('RINGING');
  const [callDuration, setCallDuration] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0); // 0-100 real-time mic volume
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [answerDuration, setAnswerDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  // Microphone Check Green Room State
  const [micCheckActive, setMicCheckActive] = useState(false);
  const [micCheckLevel, setMicCheckLevel] = useState(0);
  const [micCheckDetected, setMicCheckDetected] = useState(false);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  // Starting load
  const [starting, setStarting] = useState(false);

  // Refs
  const candidateVideoRef = useRef<HTMLVideoElement>(null);
  const greenRoomVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const interimSpeechRef = useRef<string>('');

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingChatEndRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // ── 1. Initial Load ──
  useEffect(() => {
    Promise.all([
      fetch('/api/interview/sessions').then((r) => r.json()),
      fetch('/api/jobs?acceptedOnly=true').then((r) => r.json()),
    ]).then(([sessionsData, jobsData]) => {
      if (sessionsData.success) setSessions(sessionsData.data);
      if (jobsData.success) {
        setMatches(jobsData.data);
        if (jobsData.data.length > 0) setSelectedJobId(jobsData.data[0].job_id);
      }
    });

    // Populate audio input devices if available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0) setSelectedAudioDevice(audioInputs[0].deviceId);
      }).catch(() => {});
    }

    // Warm up speech synthesis voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      cleanupAudioAndVideo();
    };
  }, []);

  // ── 2. Video Element Binding ──
  useEffect(() => {
    if (activeScreen === 'video_session' && candidateVideoRef.current && streamRef.current) {
      candidateVideoRef.current.srcObject = streamRef.current;
      candidateVideoRef.current.play().catch(() => {});
    }
  }, [activeScreen, cameraOn]);

  useEffect(() => {
    if (activeScreen === 'setup' && greenRoomVideoRef.current && streamRef.current) {
      greenRoomVideoRef.current.srcObject = streamRef.current;
      greenRoomVideoRef.current.play().catch(() => {});
    }
  }, [activeScreen, micCheckActive]);

  // Scroll transcripts
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    if (typingChatEndRef.current) typingChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // ── 3. Audio Meter (AudioContext + AnalyserNode) ──
  const setupAudioMeter = (stream: MediaStream, isGreenRoom = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));

        if (isGreenRoom) {
          setMicCheckLevel(normalized);
          if (normalized > 12) setMicCheckDetected(true);
        } else {
          setAudioLevel(normalized);
        }

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch (e) {
      console.warn('AudioContext meter setup notice:', e);
    }
  };

  // ── 4. Media Controls (Camera & Mic) ──
  const startMedia = async (deviceId?: string, isGreenRoom = false): Promise<boolean> => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const audioConstraint: any = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (deviceId) {
        audioConstraint.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: audioConstraint,
      });

      // Verification of audio track
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length || !audioTracks[0].enabled) {
        throw new Error('No active audio track found in media stream.');
      }

      streamRef.current = stream;
      setupAudioMeter(stream, isGreenRoom);

      if (isGreenRoom && greenRoomVideoRef.current) {
        greenRoomVideoRef.current.srcObject = stream;
        greenRoomVideoRef.current.play().catch(() => {});
      } else if (candidateVideoRef.current) {
        candidateVideoRef.current.srcObject = stream;
        candidateVideoRef.current.play().catch(() => {});
      }

      setCameraOn(true);
      setMicOn(true);
      return true;
    } catch (err: any) {
      console.error('Media stream initialization failed:', err);
      toast(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone and Camera permissions are required for Video Interview mode. Please allow access in browser settings.'
          : 'Failed to access camera or microphone. Please check your hardware connections.',
        'error'
      );
      return false;
    }
  };

  const cleanupAudioAndVideo = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }
    window.speechSynthesis?.cancel();
  };

  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  };

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  // ── 5. TTS Output (AI Interviewer Speaking) ──
  const speakQuestion = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Ensure state reflects AI is speaking
    setVideoStatus('AI_SPEAKING');

    const cleanText = text.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => v.name.includes('Google') && v.lang.startsWith('en')) ||
      voices.find((v) => v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Jenny')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => {
      setVideoStatus('AI_SPEAKING');
    };

    utterance.onend = () => {
      // Transition cleanly to User Turn so user knows when to answer
      setVideoStatus('USER_TURN');
    };

    utterance.onerror = () => {
      setVideoStatus('USER_TURN');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setVideoStatus('USER_TURN');
  };

  // ── 6. Push-To-Talk Voice Recording & Whisper Transcription ──
  const startRecording = async () => {
    // Stop any remaining TTS playback to prevent interviewer hearing itself
    stopSpeaking();

    // Ensure audio stream is live
    let stream = streamRef.current;
    if (!stream || !stream.getAudioTracks().length || !stream.getAudioTracks()[0].enabled) {
      const ok = await startMedia(selectedAudioDevice);
      if (!ok) return;
      stream = streamRef.current;
    }

    if (!stream) {
      toast('Microphone unavailable. Please check mic permissions.', 'error');
      return;
    }

    // Determine supported audio mime type
    let chosenMime = 'audio/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        chosenMime = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        chosenMime = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        chosenMime = 'audio/mp4';
      }
    }

    try {
      const audioStream = new MediaStream(stream.getAudioTracks());
      const recorder = new MediaRecorder(audioStream, { mimeType: chosenMime });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Start recording with 200ms slice to guarantee frequent buffer flushes
      recorder.start(200);

      // Start duration counter
      setAnswerDuration(0);
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
      answerTimerRef.current = setInterval(() => {
        setAnswerDuration((prev) => prev + 1);
      }, 1000);

      setVideoStatus('RECORDING');
      interimSpeechRef.current = '';

      // Start live speech recognition in parallel for zero-latency local fallback
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript + ' ';
            }
            interimSpeechRef.current = transcript.trim();
          };

          rec.start();
          speechRecognitionRef.current = rec;
        } catch (e) {
          console.warn('Live speech recognition notice:', e);
        }
      }
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      toast('Could not start microphone recording. Please check your mic connection.', 'error');
      setVideoStatus('USER_TURN');
    }
  };

  const stopRecordingAndSend = async () => {
    if (videoStatus !== 'RECORDING') return;

    if (answerTimerRef.current) {
      clearInterval(answerTimerRef.current);
      answerTimerRef.current = null;
    }

    // Stop real-time browser recognizer
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
    }

    setVideoStatus('PROCESSING');

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') {
      finalizeVoiceAnswer(interimSpeechRef.current);
      return;
    }

    recorder.onstop = async () => {
      try {
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });

        console.log(`[Audio Capture] Recorded Blob: size=${audioBlob.size} bytes, type=${audioBlob.type}, duration=${answerDuration}s`);

        // Check 1: Audio Blob empty or suspiciously tiny (< 1500 bytes is essentially empty header with no audio)
        if (audioBlob.size < 1500 && !interimSpeechRef.current) {
          toast("I couldn't hear your answer. Please speak clearly into your microphone and try again.", 'error');
          setVideoStatus('USER_TURN');
          return;
        }

        // Send to Whisper API
        const formData = new FormData();
        const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';
        formData.append('file', new File([audioBlob], `candidate_voice.${ext}`, { type: mime }));

        let whisperTranscript = '';
        try {
          const res = await fetch('/api/interview/transcribe', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.success && data.text && data.text.trim().length > 0) {
            whisperTranscript = data.text.trim();
          }
        } catch (fetchErr) {
          console.warn('Whisper API call failed, falling back to live recognizer:', fetchErr);
        }

        // Determine final transcript: Prefer Whisper, fallback to parallel SpeechRecognition
        const finalAnswer = whisperTranscript || interimSpeechRef.current;

        if (!finalAnswer || finalAnswer.trim().length === 0) {
          toast("I couldn't hear your answer. Please speak clearly into your microphone and try again.", 'error');
          setVideoStatus('USER_TURN');
          return;
        }

        finalizeVoiceAnswer(finalAnswer);
      } catch (err: any) {
        console.error('Recording processing error:', err);
        if (interimSpeechRef.current) {
          finalizeVoiceAnswer(interimSpeechRef.current);
        } else {
          toast("I couldn't hear your answer. Please try again.", 'error');
          setVideoStatus('USER_TURN');
        }
      }
    };

    recorder.stop();
  };

  const finalizeVoiceAnswer = async (text: string) => {
    if (!text.trim() || !currentSession) {
      toast("I couldn't hear your answer. Please try again.", 'error');
      setVideoStatus('USER_TURN');
      return;
    }

    setVideoStatus('AI_THINKING');

    const tempSession = { ...currentSession };
    tempSession.messages = [...tempSession.messages, { role: 'candidate', content: text.trim() }];
    setCurrentSession(tempSession);

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession.id, answer: text.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.data);
        const msgs = data.data.messages;
        const lastMsg = msgs[msgs.length - 1];

        if (lastMsg?.role === 'system' && lastMsg.content === 'Interview completed.') {
          toast('Interview completed! Preparing performance evaluation...', 'success');
          setTimeout(() => endCall(), 1500);
        } else if (lastMsg?.role === 'interviewer') {
          setCurrentQuestionText(lastMsg.content);
          const qCount = msgs.filter((m: any) => m.role === 'interviewer').length;
          setQuestionIndex(qCount);
          // AI speaks the next question
          setTimeout(() => speakQuestion(lastMsg.content), 500);
        }
      } else {
        toast(data.error || 'Failed to submit response', 'error');
        setVideoStatus('USER_TURN');
      }
    } catch {
      toast('Failed to reach interview service. Please try again.', 'error');
      setVideoStatus('USER_TURN');
    }
  };

  // ── 7. Typing Mode Submission ──
  const handleTypingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAnswer = typingInput.trim();
    if (!cleanAnswer || !currentSession || typingLoading) return;

    setTypingLoading(true);
    setTypingInput('');

    const tempSession = { ...currentSession };
    tempSession.messages = [...tempSession.messages, { role: 'candidate', content: cleanAnswer }];
    setCurrentSession(tempSession);

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession.id, answer: cleanAnswer }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.data);
        const msgs = data.data.messages;
        const lastMsg = msgs[msgs.length - 1];

        if (lastMsg?.role === 'system' && lastMsg.content === 'Interview completed.') {
          toast('Interview completed!', 'success');
          setActiveScreen('ended');
        }
      } else {
        toast(data.error || 'Failed to submit answer', 'error');
      }
    } catch {
      toast('Network error submitting answer', 'error');
    } finally {
      setTypingLoading(false);
    }
  };

  // ── 8. Call Lifecycle (Start / Join / Decline / End) ──
  const startInterviewSession = async () => {
    if (!selectedJobId) {
      toast('Please select a target job first', 'error');
      return;
    }

    setStarting(true);
    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: selectedJobId, type: interviewType }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.data);
        const firstMsg = data.data.messages?.[0];
        if (firstMsg?.role === 'interviewer') {
          setCurrentQuestionText(firstMsg.content);
          setQuestionIndex(1);
        }

        if (selectedMode === 'typing') {
          // Pure typing interview: No camera or mic requested
          cleanupAudioAndVideo();
          setActiveScreen('typing_session');
        } else {
          // Video interview: Transition to incoming ringing screen
          setActiveScreen('video_session');
          setVideoStatus('RINGING');
        }
      } else {
        toast(data.error || 'Failed to start interview', 'error');
      }
    } catch {
      toast('Failed to connect to interview service', 'error');
    } finally {
      setStarting(false);
    }
  };

  const acceptVideoCall = async () => {
    // Acquire media stream with verified audio track
    const mediaOk = await startMedia(selectedAudioDevice);
    if (!mediaOk) return;

    setCallDuration(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // AI begins speaking question
    if (currentQuestionText) {
      setTimeout(() => speakQuestion(currentQuestionText), 1000);
    } else {
      setVideoStatus('USER_TURN');
    }
  };

  const declineVideoCall = () => {
    cleanupAudioAndVideo();
    setActiveScreen('setup');
    setCurrentSession(null);
  };

  const endCall = () => {
    cleanupAudioAndVideo();
    setActiveScreen('ended');
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── 9. Parse Scorecard Feedback ──
  let parsedFeedback: { summary: string; recommendations: string[] } | null = null;
  if (currentSession?.feedback) {
    try {
      parsedFeedback = JSON.parse(currentSession.feedback);
    } catch {
      parsedFeedback = { summary: currentSession.feedback, recommendations: [] };
    }
  }

  // ════════════════════════════════════════════════════════════════
  // SCREEN 1: VIDEO INTERVIEW (Incoming Call / Active Call)
  // ════════════════════════════════════════════════════════════════
  if (activeScreen === 'video_session' && currentSession) {
    // Sub-view A: Incoming Call Screen (Zoom / Google Meet Ringing)
    if (videoStatus === 'RINGING') {
      return (
        <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 animate-fade-in text-white">
          <div className="relative mb-8">
            <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
            <div className="absolute -inset-8 rounded-full bg-blue-500/10 animate-pulse" />
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-1 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center">
                <span className="text-5xl">🤖</span>
              </div>
            </div>
          </div>

          <div className="text-center max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
              <ShieldCheck size={14} /> AI Video Interview
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">HireOracle AI Interviewer</h1>
            <p className="text-slate-400 text-base font-medium mb-1">
              {currentSession?.job?.title} · {interviewType.toUpperCase()} Track
            </p>
            <p className="text-slate-500 text-sm mb-10 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Incoming video call... Click Accept to join.
            </p>
          </div>

          <div className="flex items-center gap-12">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={declineVideoCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 hover:scale-110 active:scale-95 transition-all"
              >
                <PhoneOff size={28} />
              </button>
              <span className="text-xs text-slate-400">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptVideoCall}
                className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all animate-bounce"
                style={{ animationDuration: '2s' }}
              >
                <Phone size={36} />
              </button>
              <span className="text-xs text-emerald-400 font-semibold">Accept & Join</span>
            </div>
          </div>
        </div>
      );
    }

    // Sub-view B: Active Video Call (Zoom / Google Meet layout)
    const interviewerMsgs = currentSession.messages.filter((m) => m.role === 'interviewer');
    const totalQuestions = Math.max(5, interviewerMsgs.length);

    // Dynamic status text banner
    let statusText = 'Interview in progress';
    let statusBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';

    if (videoStatus === 'AI_SPEAKING') {
      statusText = 'AI Interviewer is speaking...';
      statusBadgeColor = 'bg-blue-500/20 text-blue-300 border-blue-400/40 animate-pulse';
    } else if (videoStatus === 'USER_TURN') {
      statusText = 'Your turn — press the green Push-to-Talk button to speak';
      statusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40';
    } else if (videoStatus === 'RECORDING') {
      statusText = 'Listening to your voice... Speak your answer now';
      statusBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-400/40 animate-pulse';
    } else if (videoStatus === 'PROCESSING') {
      statusText = 'Processing your speech with Whisper...';
      statusBadgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40 animate-pulse';
    } else if (videoStatus === 'AI_THINKING') {
      statusText = 'AI is analyzing your response and preparing the next question...';
      statusBadgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40 animate-pulse';
    }

    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none text-white overflow-hidden">
        {/* Top Meeting Bar */}
        <header className="h-14 px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-semibold text-sm tracking-wide">LIVE</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div>
              <span className="text-sm font-medium text-slate-200">{currentSession.job?.title}</span>
              <span className="ml-2 text-xs text-slate-400 font-mono">({interviewType.toUpperCase()} Interview)</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Status Badge */}
            <div className={`text-xs px-3 py-1 rounded-full border font-medium flex items-center gap-1.5 ${statusBadgeColor}`}>
              <Radio size={12} className="animate-pulse" />
              <span>{statusText}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700 text-xs">
              <span className="text-blue-400 font-bold">Q {questionIndex}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{totalQuestions}</span>
            </div>

            <div className="font-mono text-sm text-slate-300 font-semibold bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
              {formatTimer(callDuration)}
            </div>
          </div>
        </header>

        {/* Main Video Call Screen Area */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Main Area: AI Interviewer Center Stage */}
          <div className="flex-1 flex flex-col relative bg-gradient-to-b from-slate-900 via-slate-920 to-slate-950 p-6 overflow-y-auto custom-scrollbar">
            {/* Center Avatar Display */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
              <div className="relative flex items-center justify-center">
                {videoStatus === 'AI_SPEAKING' && (
                  <>
                    <div className="absolute w-52 h-52 rounded-full border-2 border-blue-400/40 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute w-44 h-44 rounded-full border border-indigo-400/50 animate-pulse" />
                  </>
                )}
                <div
                  className={`relative w-36 h-36 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-1 shadow-2xl transition-all duration-300 ${
                    videoStatus === 'AI_SPEAKING' ? 'ring-4 ring-blue-400/50 scale-105' : ''
                  }`}
                >
                  <div className="w-full h-full rounded-[22px] bg-slate-900 flex flex-col items-center justify-center overflow-hidden relative">
                    <span className="text-5xl">{videoStatus === 'AI_SPEAKING' ? '🗣️' : '🤖'}</span>
                    {videoStatus === 'AI_SPEAKING' && (
                      <div className="absolute bottom-2 flex items-center gap-1">
                        <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1 h-5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center mt-4">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-bold text-slate-100">HireOracle AI Interviewer</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Host
                  </span>
                </div>
              </div>
            </div>

            {/* Current Question Banner */}
            <div className="w-full max-w-3xl mx-auto mt-auto">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-5 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    Question {questionIndex} of {totalQuestions}
                  </span>

                  <button
                    onClick={() => speakQuestion(currentQuestionText)}
                    disabled={videoStatus === 'AI_SPEAKING' || videoStatus === 'RECORDING'}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={13} /> Replay Question
                  </button>
                </div>

                <p className="text-base text-slate-100 font-medium leading-relaxed">
                  {currentQuestionText || 'Preparing question...'}
                </p>
              </div>
            </div>
          </div>

          {/* Picture-in-Picture: Candidate Video Preview in Top Right Corner */}
          <div className="absolute top-4 right-4 w-64 aspect-video rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-2xl z-20">
            <video
              ref={candidateVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!cameraOn ? 'hidden' : ''}`}
              style={{ transform: 'scaleX(-1)' }}
            />

            {!cameraOn && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                <VideoOff size={28} className="mb-1 opacity-50" />
                <span className="text-[11px]">Camera Off</span>
              </div>
            )}

            {/* Candidate Tag */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700/50">
              <UserCheck size={11} className="text-emerald-400" /> You
            </div>

            {/* Real-time Mic Activity Equalizer */}
            <div className="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Mic size={12} className={micOn ? 'text-emerald-400' : 'text-rose-400'} />
                <span className="text-[10px] text-slate-300 font-medium">
                  {videoStatus === 'RECORDING' ? `Rec (${formatTimer(answerDuration)})` : micOn ? 'Mic On' : 'Muted'}
                </span>
              </div>

              {/* 5-bar live volume level indicator */}
              <div className="flex items-end gap-0.5 h-2.5">
                <span className={`w-1 rounded-full ${audioLevel > 5 ? 'bg-emerald-400 h-2.5' : 'bg-slate-700 h-0.5'}`} />
                <span className={`w-1 rounded-full ${audioLevel > 20 ? 'bg-emerald-400 h-2.5' : 'bg-slate-700 h-0.5'}`} />
                <span className={`w-1 rounded-full ${audioLevel > 40 ? 'bg-emerald-400 h-2.5' : 'bg-slate-700 h-0.5'}`} />
                <span className={`w-1 rounded-full ${audioLevel > 65 ? 'bg-yellow-400 h-2.5' : 'bg-slate-700 h-0.5'}`} />
                <span className={`w-1 rounded-full ${audioLevel > 85 ? 'bg-rose-400 h-2.5' : 'bg-slate-700 h-0.5'}`} />
              </div>
            </div>
          </div>

          {/* Transcript Slide-out Drawer */}
          {showTranscript && (
            <div className="absolute inset-y-0 right-0 w-96 bg-slate-900/98 backdrop-blur-md border-l border-slate-800 shadow-2xl z-30 flex flex-col">
              <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-sm">Conversation Transcript</span>
                <button
                  onClick={() => setShowTranscript(false)}
                  className="text-slate-400 hover:text-white text-sm p-1"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {currentSession.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'interviewer'
                        ? 'bg-blue-950/40 border border-blue-900/50 text-blue-100'
                        : msg.role === 'candidate'
                        ? 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-100'
                        : 'bg-slate-800 text-slate-400 text-center'
                    }`}
                  >
                    <div className="font-bold uppercase tracking-wider text-[10px] mb-1 opacity-75">
                      {msg.role === 'interviewer' ? '🤖 Interviewer' : msg.role === 'candidate' ? '👤 You' : 'System'}
                    </div>
                    <div>{msg.content}</div>
                    {msg.score !== undefined && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 text-[11px] text-amber-400 font-semibold">
                        Score: {msg.score}/10 — {msg.feedback}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Meeting Controls Bar (Zoom/Google Meet Style) */}
        <footer className="h-20 px-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">Voice Engine: Whisper Turbo</span>
          </div>

          {/* Central Call Actions */}
          <div className="flex items-center gap-4">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                micOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={micOn ? 'Mute Mic' : 'Unmute Mic'}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                cameraOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-rose-600 text-white'
              }`}
              title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            {/* PUSH-TO-TALK BUTTON (Main Voice Action) */}
            {videoStatus === 'RECORDING' ? (
              <button
                onClick={stopRecordingAndSend}
                className="h-12 px-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 animate-pulse transition-all"
              >
                <CheckCircle size={18} /> Finish Speaking ({formatTimer(answerDuration)})
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={videoStatus === 'AI_SPEAKING' || videoStatus === 'PROCESSING' || videoStatus === 'AI_THINKING'}
                className={`h-12 px-6 rounded-full font-bold flex items-center gap-2 shadow-lg transition-all ${
                  videoStatus === 'USER_TURN'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                <Mic size={18} /> Push to Talk
              </button>
            )}

            {/* Transcript Drawer Toggle */}
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                showTranscript ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Toggle Transcript"
            >
              <MessageSquare size={20} />
            </button>

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="w-14 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 ml-2 transition-all"
              title="End Interview Call"
            >
              <PhoneOff size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">Channel: Secure</span>
          </div>
        </footer>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SCREEN 2: TYPING INTERVIEW MODE (Simple, No Mic/Cam Required)
  // ════════════════════════════════════════════════════════════════
  if (activeScreen === 'typing_session' && currentSession) {
    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">
              <Keyboard size={13} /> Typing Interview Mode
            </div>
            <h2 className="text-lg font-bold text-slate-900">{currentSession.job?.title}</h2>
            <p className="text-xs text-slate-500">{currentSession.type.toUpperCase()} Track · Text-Based Evaluation</p>
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              setActiveScreen('ended');
            }}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            End Interview
          </Button>
        </div>

        {/* Conversation Message Feed */}
        <Card className="flex-1 flex flex-col overflow-hidden bg-white border border-slate-200 shadow-sm p-4">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {currentSession.messages.map((msg, idx) => (
              <ChatBubble
                key={idx}
                role={msg.role}
                content={msg.content}
                score={msg.score}
                feedback={msg.feedback}
              />
            ))}
            {typingLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-slate-100 border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1">AI interviewer is reviewing your answer...</span>
                </div>
              </div>
            )}
            <div ref={typingChatEndRef} />
          </div>

          {/* Typing Answer Input Box */}
          <form onSubmit={handleTypingSubmit} className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex gap-2">
              <textarea
                value={typingInput}
                onChange={(e) => setTypingInput(e.target.value)}
                placeholder="Type your interview answer here in detail... (Shift + Enter for new line)"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTypingSubmit(e);
                  }
                }}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white resize-none custom-scrollbar"
              />
              <Button
                type="submit"
                disabled={typingLoading || !typingInput.trim()}
                className="self-end bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 h-auto rounded-xl"
              >
                <Send size={16} className="mr-1.5" /> Submit
              </Button>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Press Enter to submit answer.
            </span>
          </form>
        </Card>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SCREEN 3: POST-INTERVIEW SCORECARD & REPORT
  // ════════════════════════════════════════════════════════════════
  if (activeScreen === 'ended' && currentSession) {
    const candidateAnswers = currentSession.messages.filter((m) => m.role === 'candidate');
    const avgScore = currentSession.overall_score
      ? Math.round(currentSession.overall_score * 10) / 10
      : null;

    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10 animate-fade-in text-slate-900">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="text-center p-8 bg-white border border-slate-200 shadow-sm" gradientBorder>
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Award size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">AI Interview Performance Scorecard</h1>
            <p className="text-slate-500 text-sm mt-1">
              Position: <span className="font-semibold text-slate-800">{currentSession.job?.title}</span> · Track:{' '}
              <span className="font-semibold text-slate-800">{currentSession.type.toUpperCase()}</span>
            </p>

            {avgScore !== null && (
              <div className="mt-6 inline-flex items-center gap-4 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Overall Score</div>
                  <div className="text-3xl font-black text-blue-600">{avgScore} / 10</div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="text-left text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">
                    {avgScore >= 8 ? 'Strong Candidate' : avgScore >= 6 ? 'Passed Threshold' : 'Needs Practice'}
                  </div>
                  <div>{candidateAnswers.length} responses evaluated</div>
                </div>
              </div>
            )}
          </Card>

          {parsedFeedback && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border border-slate-200">
                <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-blue-600" /> Recruiter Evaluation Summary
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">{parsedFeedback.summary}</p>
              </Card>

              <Card className="p-6 bg-white border border-slate-200">
                <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" /> Actionable Recommendations
                </h3>
                <ul className="space-y-2">
                  {parsedFeedback.recommendations?.map((rec, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          <Card className="p-6 bg-white border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
              <History size={18} className="text-indigo-600" /> Question-by-Question Breakdown
            </h3>

            <div className="space-y-4">
              {currentSession.messages
                .filter((m) => m.role !== 'system')
                .map((msg, idx) => (
                  <ChatBubble
                    key={idx}
                    role={msg.role}
                    content={msg.content}
                    score={msg.score}
                    feedback={msg.feedback}
                  />
                ))}
            </div>
          </Card>

          <div className="text-center pt-4">
            <Button
              onClick={() => {
                setActiveScreen('setup');
                setCurrentSession(null);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-8 py-3 rounded-xl shadow-md"
            >
              Start Another Interview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SCREEN 4: SETUP SCREEN & GREEN ROOM DEVICE CHECK
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Left Column: Interview Configuration */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Play size={18} className="text-blue-600" /> Setup Interview
          </h2>

          <div className="space-y-4">
            {/* 1. Select Job */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Target Role
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                {matches.length === 0 && <option value="">No accepted jobs available</option>}
                {matches.map((m) => (
                  <option key={m.id} value={m.job_id}>
                    {m.job?.title} at {m.job?.company}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Interview Track */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Interview Track
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInterviewType('hr')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    interviewType === 'hr'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  HR & Behavioral
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewType('technical')}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    interviewType === 'technical'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Technical Q&A
                </button>
              </div>
            </div>

            {/* 3. Choose Interview Mode (Two clearly separated modes) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Interview Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('typing');
                    cleanupAudioAndVideo();
                    setMicCheckActive(false);
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                    selectedMode === 'typing'
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 mb-0.5">
                    <Keyboard size={14} className="text-blue-600" /> Typing Mode
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Type your answers. No camera or microphone needed.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('video')}
                  className={`p-3 rounded-xl border text-left flex flex-col transition-all ${
                    selectedMode === 'video'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 mb-0.5">
                    <Video size={14} className="text-emerald-600" /> Video Mode
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Zoom/Google Meet simulation with AI voice & Whisper.
                  </p>
                </button>
              </div>
            </div>

            {/* Launch Button */}
            <Button
              onClick={startInterviewSession}
              disabled={starting || !selectedJobId}
              className={`w-full text-white font-semibold py-3 rounded-xl shadow-md ${
                selectedMode === 'video'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}
              size="lg"
              isLoading={starting}
            >
              {selectedMode === 'video' ? (
                <>
                  <Video size={16} className="mr-2" /> Start Video Interview
                </>
              ) : (
                <>
                  <Play size={16} className="mr-2" /> Start Typing Interview
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Past Sessions List */}
        <Card className="flex-1 flex flex-col min-h-0">
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <History size={16} className="text-indigo-600" /> Past Scorecards
          </h2>
          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
            {sessions.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No past interview sessions yet.</p>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setCurrentSession(session);
                  setActiveScreen('ended');
                }}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer transition-all"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {session.type}
                  </span>
                  {session.overall_score !== null && (
                    <span className="text-xs font-black text-blue-600">
                      {Math.round(session.overall_score * 10) / 10} / 10
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-slate-800 truncate">{session.job?.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right Column: Preview & Microphone Check Station */}
      <Card className="lg:col-span-3 flex flex-col p-8 items-center justify-center relative overflow-hidden" gradientBorder>
        {selectedMode === 'video' ? (
          <div className="max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <Video size={30} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">Video Interview Green Room</h2>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Test your microphone and camera before entering the interview to guarantee clean voice detection.
              </p>
            </div>

            {/* Hardware Self-Check Station */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sliders size={14} className="text-blue-600" /> Microphone & Camera Test
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setMicCheckActive(true);
                    startMedia(selectedAudioDevice, true);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  {micCheckActive ? 'Restart Check' : 'Click to Test Mic & Camera'}
                </button>
              </div>

              {/* Camera Test Box */}
              <div className="relative w-full aspect-video rounded-xl bg-slate-900 overflow-hidden border border-slate-300">
                <video
                  ref={greenRoomVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!micCheckActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                    <Video size={24} className="mb-1 opacity-50" />
                    <span>Click &quot;Click to Test Mic & Camera&quot; above to check your devices</span>
                  </div>
                )}
              </div>

              {/* Live Audio Level Meter & Detection Feedback */}
              {micCheckActive && (
                <div className="space-y-2 pt-1">
                  {/* Select Microphone Hardware */}
                  {audioDevices.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Select Microphone:
                      </label>
                      <select
                        value={selectedAudioDevice}
                        onChange={(e) => {
                          setSelectedAudioDevice(e.target.value);
                          startMedia(e.target.value, true);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700"
                      >
                        {audioDevices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Audio Meter Visual Bar */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Mic size={14} className={micCheckLevel > 5 ? 'text-emerald-500' : 'text-slate-400'} />
                        Microphone Input Level
                      </span>

                      {micCheckDetected ? (
                        <span className="text-emerald-600 flex items-center gap-1 font-bold text-[11px]">
                          <CheckCircle size={12} /> Voice Detected ✓
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px]">
                          Speak into your mic to test...
                        </span>
                      )}
                    </div>

                    {/* Equalizer Bar */}
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-75 rounded-full ${
                          micCheckLevel > 60
                            ? 'bg-yellow-500'
                            : micCheckLevel > 10
                            ? 'bg-emerald-500'
                            : 'bg-slate-300'
                        }`}
                        style={{ width: `${Math.max(4, micCheckLevel)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              When ready, select your job on the left and click <strong>&quot;Start Video Interview&quot;</strong>.
            </p>
          </div>
        ) : (
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
              <Keyboard size={30} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Typing Interview Mode</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Standard chat-based interview session. Read the AI interviewer&apos;s questions and type your responses at your own pace.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>Zero hardware requirements (no camera or microphone needed).</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>Full AI response analysis and question-by-question scoring.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>Complete performance scorecard upon finishing.</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Select your job on the left and click <strong>&quot;Start Typing Interview&quot;</strong> to begin.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
