import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, setDoc, addDoc, query, where, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface UseWebRTCVoiceProps {
  roomId: string;
  userId: string;
  isJoined: boolean;
  isDeafened?: boolean;
}

// ICE Servers (Free Google STUN)
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTCVoice({ roomId, userId, isJoined, isDeafened = false }: UseWebRTCVoiceProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(0); // For local mic testing
  
  const peersRef = useRef<{ [peerId: string]: RTCPeerConnection }>({});
  const audioElementsRef = useRef<{ [peerId: string]: HTMLAudioElement }>({});
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // 1. Get Local Audio & Setup Visualizer
  useEffect(() => {
    if (!isJoined) {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }
      return;
    }

    let stream: MediaStream;
    let audioContext: AudioContext;

    const startAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setLocalStream(stream);

        // Setup Audio Visualizer for Mic Testing
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setVolumeLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

      } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('حدث خطأ أثناء محاولة الوصول إلى الميكروفون. يرجى التأكد من إعطاء الصلاحيات.');
      }
    };

    startAudio();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContext) audioContext.close();
    };
  }, [isJoined]);

  // Toggle Mute
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Handle incoming Answer
  const handleAnswer = useCallback(async (senderId: string, answer: RTCSessionDescriptionInit, docId: string) => {
    const pc = peersRef.current[senderId];
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
    await deleteDoc(doc(db, 'rooms', roomId, 'signals', docId));
  }, [roomId]);

  // Handle incoming ICE Candidate
  const handleIceCandidate = useCallback(async (senderId: string, candidate: RTCIceCandidateInit, docId: string) => {
    const pc = peersRef.current[senderId];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    await deleteDoc(doc(db, 'rooms', roomId, 'signals', docId));
  }, [roomId]);

  // Handle deafen state
  useEffect(() => {
    Object.values(audioElementsRef.current).forEach((audio) => {
      if (audio instanceof HTMLAudioElement) {
        audio.muted = isDeafened;
      }
    });
  }, [isDeafened]);

  // Helper to create a Peer Connection
  const createPeerConnection = useCallback((peerId: string) => {
    if (peersRef.current[peerId]) return peersRef.current[peerId];

    const pc = new RTCPeerConnection(rtcConfig);
    peersRef.current[peerId] = pc;

    // Add local stream tracks
    localStream?.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addDoc(collection(db, 'rooms', roomId, 'signals'), {
          type: 'ice-candidate',
          sender: userId,
          receiver: peerId,
          candidate: event.candidate.toJSON(),
          timestamp: serverTimestamp()
        });
      }
    };

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      if (!audioElementsRef.current[peerId]) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.muted = isDeafened;
        audioElementsRef.current[peerId] = audio;
      }
      audioElementsRef.current[peerId].srcObject = event.streams[0];
    };

    // Handle disconnects
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        pc.close();
        delete peersRef.current[peerId];
        if (audioElementsRef.current[peerId]) {
          audioElementsRef.current[peerId].pause();
          delete audioElementsRef.current[peerId];
        }
      }
    };

    return pc;
  }, [localStream, roomId, userId, isDeafened]);

  // Handle incoming Offer
  const handleOffer = useCallback(async (senderId: string, offer: RTCSessionDescriptionInit, docId: string) => {
    const pc = createPeerConnection(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await addDoc(collection(db, 'rooms', roomId, 'signals'), {
      type: 'answer',
      sender: userId,
      receiver: senderId,
      answer: { type: answer.type, sdp: answer.sdp },
      timestamp: serverTimestamp()
    });

    await deleteDoc(doc(db, 'rooms', roomId, 'signals', docId));
  }, [createPeerConnection, roomId, userId]);

  // WebRTC Signaling Logic
  useEffect(() => {
    if (!isJoined || !localStream) return;

    const signalsRef = collection(db, 'rooms', roomId, 'signals');
    
    // Listen for incoming signals
    const unsubscribe = onSnapshot(query(signalsRef, where('receiver', '==', userId)), async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const senderId = data.sender;
          
          if (data.type === 'offer') {
            await handleOffer(senderId, data.offer, change.doc.id);
          } else if (data.type === 'answer') {
            await handleAnswer(senderId, data.answer, change.doc.id);
          } else if (data.type === 'ice-candidate') {
            await handleIceCandidate(senderId, data.candidate, change.doc.id);
          }
        }
      });
    });

    return () => {
      unsubscribe();
      // Cleanup peer connections
      Object.keys(peersRef.current).forEach(key => {
        const pc = peersRef.current[key];
        if (pc) pc.close();
      });
      peersRef.current = {};
      Object.keys(audioElementsRef.current).forEach(key => {
        const audio = audioElementsRef.current[key];
        if (audio) {
          audio.pause();
          audio.srcObject = null;
        }
      });
      audioElementsRef.current = {};
    };
  }, [isJoined, localStream, roomId, userId, handleOffer, handleAnswer, handleIceCandidate]);

  // Initiate call to a new participant
  const initiateCall = useCallback(async (peerId: string) => {
    if (peerId === userId || peersRef.current[peerId]) return;

    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await addDoc(collection(db, 'rooms', roomId, 'signals'), {
      type: 'offer',
      sender: userId,
      receiver: peerId,
      offer: { type: offer.type, sdp: offer.sdp },
      timestamp: serverTimestamp()
    });
  }, [roomId, userId, createPeerConnection]);

  return {
    isMuted,
    toggleMute,
    setIsMuted,
    volumeLevel,
    initiateCall
  };
}
