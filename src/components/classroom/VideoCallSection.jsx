// src/components/classroom/VideoCallSection.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useHMSStore,
    useHMSActions,
    selectIsConnectedToRoom,
    selectPeers,
    selectLocalPeer,
    selectIsPeerAudioEnabled,
    selectIsPeerVideoEnabled,
} from '@100mslive/react-sdk';
import {
    collection,
    doc,
    getDoc,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
    Video, VideoOff, Mic, MicOff, Monitor, Users,
    Phone, Settings, MessageSquare, Hand, Camera,
    Loader2, Send, X, Volume2, VolumeX, Maximize2, Minimize2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Get API URL from environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// VIDEO TILE COMPONENT - Fixed camera cleanup
const VideoTile = ({ peer, isLocal, isFullscreen }) => {
    const videoRef = useRef(null);
    const hmsActions = useHMSActions();

    useEffect(() => {
        let cleanupVideo = null;

        if (videoRef.current && peer.videoTrack) {
            hmsActions.attachVideo(peer.videoTrack, videoRef.current);

            // Store cleanup function
            cleanupVideo = () => {
                try {
                    if (videoRef.current && peer.videoTrack) {
                        hmsActions.detachVideo(peer.videoTrack, videoRef.current);
                    }
                } catch (error) {
                    console.log('Video cleanup:', error);
                }
            };
        }

        return () => {
            if (cleanupVideo) cleanupVideo();

            // Ensure video stream is stopped
            if (videoRef.current) {
                const videoEl = videoRef.current;
                if (videoEl.srcObject) {
                    videoEl.srcObject.getTracks().forEach(track => track.stop());
                    videoEl.srcObject = null;
                }
            }
        };
    }, [peer.videoTrack, hmsActions, peer.id]);

    return (
        <div className={`relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl overflow-hidden
            shadow-2xl border-2 border-gray-700/50 transition-all duration-300 group
            ${isFullscreen ? 'h-full w-full' : 'min-h-[240px]'}`}>

            <video
                ref={videoRef}
                autoPlay
                muted={isLocal}
                playsInline
                className="w-full h-full object-cover min-h-[240px]"
                onContextMenu={(e) => e.preventDefault()}
            />

            {!peer.videoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm">
                    <div className="w-24 h-24 bg-gradient-to-br from-silver/20 to-gray-600/30 rounded-full flex items-center justify-center
                        border-2 border-gray-500/30 backdrop-blur-xl">
                        <span className="text-4xl font-bold text-white">
                            {peer.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                </div>
            )}

            <div className="absolute bottom-3 left-3 px-4 py-2 bg-gradient-to-r from-black/80 to-gray-900/80
                backdrop-blur-xl rounded-xl border border-gray-600/50 shadow-lg">
                <p className="text-white font-bold text-sm flex items-center gap-2">
                    {peer.name}
                    {isLocal && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-gray-700 to-gray-800 text-xs rounded-lg">
                            You
                        </span>
                    )}
                    {peer.role === 'host' && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-blue-700 text-xs rounded-lg">
                            Teacher
                        </span>
                    )}
                </p>
            </div>

            {peer.audioEnabled === false && (
                <div className="absolute top-3 right-3 p-2 bg-black/70 backdrop-blur-md rounded-full">
                    <VolumeX size={16} className="text-white" />
                </div>
            )}

            {/* Glassmorphism overlay effect */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/5 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
        </div>
    );
};

const VideoCallSection = ({ classId, isTeacher }) => {
    const { user } = useAuth();
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isJoiningCall, setIsJoiningCall] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [activeSpeaker, setActiveSpeaker] = useState(null);
    const [lastLeftTime, setLastLeftTime] = useState(null);

    const chatEndRef = useRef(null);
    const videoContainerRef = useRef(null);
    const hasJoinedRef = useRef(false);
    const localTracksRef = useRef([]);

    // HMS hooks
    const hmsActions = useHMSActions();
    const isConnected = useHMSStore(selectIsConnectedToRoom);
    const peers = useHMSStore(selectPeers);
    const localPeer = useHMSStore(selectLocalPeer);
    const isLocalAudioEnabled = useHMSStore(selectIsPeerAudioEnabled(localPeer?.id));
    const isLocalVideoEnabled = useHMSStore(selectIsPeerVideoEnabled(localPeer?.id));

    // Track active speaker
    useEffect(() => {
        const activePeer = peers.find(p => p.isSpeaking);
        if (activePeer && activePeer.id !== activeSpeaker) {
            setActiveSpeaker(activePeer.id);
        }
    }, [peers]);

    // Fix: Clean up all tracks when component unmounts
    useEffect(() => {
        return () => {
            console.log('Component unmounting, cleaning up tracks...');
            localTracksRef.current.forEach(track => {
                if (track && typeof track.stop === 'function') {
                    track.stop();
                }
            });
            localTracksRef.current = [];
        };
    }, []);

    // Fetch room data from Firebase
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const roomRef = doc(db, 'rooms', classId);
                const roomSnap = await getDoc(roomRef);

                if (!roomSnap.exists()) {
                    toast.error('Classroom not found!');
                    return;
                }

                setRoomData({ id: roomSnap.id, ...roomSnap.data() });
            } catch (error) {
                console.error('Error fetching room:', error);
                toast.error('Failed to load classroom');
            }
        };

        if (classId) fetchRoom();
    }, [classId]);

    // Listen to chat messages
    useEffect(() => {
        if (!classId) return;

        const messagesRef = collection(db, 'rooms', classId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [classId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Join 100ms room with backend - CREATE ROOM FIRST then GET TOKEN
    const joinVideoCall = useCallback(async () => {
        if (!roomData || !user || isConnected || isJoiningCall) return;

        try {
            setIsJoiningCall(true);
            console.log('🔄 Joining 100ms room...');

            // Check if we're re-joining too quickly
            if (lastLeftTime && Date.now() - lastLeftTime < 2000) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 1: Create room in 100ms
            const roomResponse = await fetch(`${API_URL}/token/create-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: roomData.name || 'Classroom Session',
                    description: roomData.description || 'Live class session'
                })
            });

            if (!roomResponse.ok) {
                const errorText = await roomResponse.text();
                throw new Error(`Backend error: ${errorText}`);
            }

            const roomResult = await roomResponse.json();

            if (!roomResult.success) {
                throw new Error(roomResult.error || 'Failed to create room');
            }

            console.log('✅ Room created with ID:', roomResult.roomId);

            // Step 2: Generate token with the room ID
            const tokenResponse = await fetch(`${API_URL}/token/generate-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomId: roomResult.roomId,
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    role: isTeacher ? 'host' : 'guest'
                })
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                throw new Error(`Backend error: ${errorText}`);
            }

            const tokenResult = await tokenResponse.json();

            if (!tokenResult.success) {
                throw new Error(tokenResult.error || 'Failed to generate token');
            }

            console.log('✅ Token generated');

            // Step 3: Store local tracks for cleanup
            const config = {
                userName: user.displayName || 'Anonymous',
                authToken: tokenResult.token,
                settings: {
                    isAudioMuted: false,
                    isVideoMuted: false,
                },
                captureNetworkQualityInPreview: true,
            };

            // Join with proper error handling
            await hmsActions.join(config);

            console.log('✅ Joined 100ms room successfully');
            toast.success('Connected to video call!');

            // Store local tracks for cleanup
            if (localPeer) {
                const tracks = hmsActions.getLocalTracks();
                localTracksRef.current = tracks || [];
            }

        } catch (error) {
            console.error('❌ Error joining 100ms room:', error);

            // Better error handling
            if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                toast.error('Cannot connect to server. Please check your network connection.');
            } else if (error.message.includes('permission') || error.message.includes('camera')) {
                toast.error('Camera/microphone access is required. Please allow permissions.');
            } else {
                toast.error(error.message || 'Failed to join video call');
            }

            // Reset joining state
            setIsJoiningCall(false);
            hasJoinedRef.current = false;
        }
    }, [roomData, user, isConnected, isJoiningCall, hmsActions, localPeer, lastLeftTime, isTeacher]);

    // Trigger join when room data is loaded
    useEffect(() => {
        if (roomData && user && !isConnected && !isJoiningCall && !hasJoinedRef.current) {
            joinVideoCall();
            hasJoinedRef.current = true;
        }
    }, [roomData, user, isConnected, isJoiningCall, joinVideoCall]);

    // Join Firestore room
    useEffect(() => {
        const joinFirestoreRoom = async () => {
            if (!roomData || !user || !isConnected) return;

            try {
                const roomRef = doc(db, 'rooms', classId);
                await updateDoc(roomRef, {
                    participants: arrayUnion({
                        userId: user.uid,
                        displayName: user.displayName || 'Anonymous',
                        photoURL: user.photoURL || null,
                        joinedAt: new Date().toISOString(),
                        isOnline: true,
                        role: isTeacher ? 'teacher' : 'student'
                    }),
                    lastActive: serverTimestamp()
                });

                await addDoc(collection(db, 'rooms', classId, 'messages'), {
                    type: 'system',
                    text: `${user.displayName || 'Someone'} joined the session`,
                    timestamp: serverTimestamp()
                });
            } catch (error) {
                console.error('Error joining Firestore room:', error);
            }
        };

        if (isConnected) {
            joinFirestoreRoom();
        }
    }, [isConnected, roomData, user, classId, isTeacher]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !user) return;

        try {
            await addDoc(collection(db, 'rooms', classId, 'messages'), {
                type: 'message',
                text: messageText.trim(),
                senderId: user.uid,
                senderName: user.displayName || 'Anonymous',
                senderPhoto: user.photoURL || null,
                timestamp: serverTimestamp()
            });
            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        }
    };

    const toggleAudio = async () => {
        try {
            await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
            toast.success(isLocalAudioEnabled ? 'Muted' : 'Unmuted');
        } catch (error) {
            console.error('Error toggling audio:', error);
            toast.error('Failed to toggle audio');
        }
    };

    const toggleVideo = async () => {
        try {
            await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
            toast.success(isLocalVideoEnabled ? 'Camera off' : 'Camera on');
        } catch (error) {
            console.error('Error toggling video:', error);
            toast.error('Failed to toggle camera');
        }
    };

    // FIXED: Properly handle leaving with full cleanup
    const handleLeave = async () => {
        try {
            // Step 1: Disable local tracks first
            if (hmsActions.setLocalAudioEnabled) {
                await hmsActions.setLocalAudioEnabled(false);
            }
            if (hmsActions.setLocalVideoEnabled) {
                await hmsActions.setLocalVideoEnabled(false);
            }

            // Step 2: Stop all local tracks manually
            try {
                const tracks = hmsActions.getLocalTracks?.() || [];
                tracks.forEach(track => {
                    if (track && typeof track.stop === 'function') {
                        track.stop();
                    }
                });
            } catch (trackError) {
                console.log('Track cleanup:', trackError);
            }

            // Step 3: Leave the HMS room
            if (isConnected) {
                await hmsActions.leave();
            }

            // Step 4: Update Firestore
            if (user && roomData) {
                const roomRef = doc(db, 'rooms', classId);
                const participantToRemove = participants.find(p => p.userId === user.uid);

                if (participantToRemove) {
                    await updateDoc(roomRef, {
                        participants: arrayRemove(participantToRemove)
                    });
                }

                await addDoc(collection(db, 'rooms', classId, 'messages'), {
                    type: 'system',
                    text: `${user.displayName || 'Someone'} left the session`,
                    timestamp: serverTimestamp()
                });
            }

            // Step 5: Clean up video elements
            const videoElements = document.querySelectorAll('video');
            videoElements.forEach(video => {
                if (video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                }
            });

            // Step 6: Set leave time to prevent immediate rejoin
            setLastLeftTime(Date.now());
            hasJoinedRef.current = false;

            toast.success('Left live session');

        } catch (error) {
            console.error('Error leaving room:', error);
            toast.error('Error leaving session');
        }
    };

    // Toggle fullscreen for main video
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            videoContainerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Handle fullscreen change
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    if (!isInCall) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Preview */}
                <div className="relative bg-gradient-to-br from-gray-900 to-black aspect-video flex items-center justify-center">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative text-center text-white">
                        <Video size={64} className="mx-auto mb-4" />
                        <h3 className="text-2xl font-black mb-2">No Active Session</h3>
                        <p className="text-gray-400">
                            {isTeacher 
                                ? 'Start a live session to teach your students' 
                                : 'Wait for your teacher to start the session'}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                    {/* Pre-call Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setIsCameraOn(!isCameraOn)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                isCameraOn 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-red-500 bg-red-50'
                            }`}
                        >
                            {isCameraOn ? (
                                <Video size={20} className="text-green-600" />
                            ) : (
                                <VideoOff size={20} className="text-red-600" />
                            )}
                            <span className="font-bold text-black">
                                Camera {isCameraOn ? 'On' : 'Off'}
                            </span>
                        </button>

                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                isMicOn 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-red-500 bg-red-50'
                            }`}
                        >
                            {isMicOn ? (
                                <Mic size={20} className="text-green-600" />
                            ) : (
                                <MicOff size={20} className="text-red-600" />
                            )}
                            <span className="font-bold text-black">
                                Mic {isMicOn ? 'On' : 'Off'}
                            </span>
                        </button>
                    </div>

                    {/* Join Button */}
                    {isTeacher ? (
                        <button
                            onClick={startSession}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            <Video size={24} />
                            Start Live Session
                        </button>
                    ) : (
                        <button
                            onClick={startSession}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            <Video size={24} />
                            Join Session
                        </button>
                    )}

                    <p className="text-center text-sm text-gray-500">
                        {isTeacher 
                            ? 'Students will be notified when you start' 
                            : 'You will be notified when session starts'}
                    </p>
                </div>
            </div>
        );
    }

    // Active Call UI
    return (
        <div className="space-y-4">
            {/* Main Video Grid */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden">
                {/* Video Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
                    {/* Teacher/Main Video */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-2 md:col-span-3 aspect-video bg-gray-800 rounded-xl relative overflow-hidden"
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Camera size={64} className="text-gray-600" />
                        </div>
                        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/80 backdrop-blur-xl rounded-lg">
                            <span className="text-white font-bold text-sm">
                                {isTeacher ? 'You (Teacher)' : 'Teacher Name'}
                            </span>
                        </div>
                        {!isCameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <VideoOff size={48} className="text-white" />
                            </div>
                        )}
                    </motion.div>

                    {/* Student Videos */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="aspect-video bg-gray-800 rounded-xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Users size={32} className="text-gray-600" />
                            </div>
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-xl rounded text-xs">
                                <span className="text-white font-bold">Student {i}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Control Bar */}
                <div className="bg-black/50 backdrop-blur-xl border-t border-white/10 p-6">
                    <div className="flex items-center justify-center gap-3">
                        {/* Camera Toggle */}
                        <button
                            onClick={() => setIsCameraOn(!isCameraOn)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                isCameraOn 
                                    ? 'bg-gray-700 hover:bg-gray-600' 
                                    : 'bg-red-500 hover:bg-red-600'
                            }`}
                        >
                            {isCameraOn ? (
                                <Video size={20} className="text-white" />
                            ) : (
                                <VideoOff size={20} className="text-white" />
                            )}
                        </button>

                        {/* Mic Toggle */}
                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                isMicOn 
                                    ? 'bg-gray-700 hover:bg-gray-600' 
                                    : 'bg-red-500 hover:bg-red-600'
                            }`}
                        >
                            {isMicOn ? (
                                <Mic size={20} className="text-white" />
                            ) : (
                                <MicOff size={20} className="text-white" />
                            )}
                        </button>

                        {/* Screen Share (Teacher only) */}
                        {isTeacher && (
                            <button
                                onClick={() => setIsScreenSharing(!isScreenSharing)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                    isScreenSharing 
                                        ? 'bg-blue-500 hover:bg-blue-600' 
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <Monitor size={20} className="text-white" />
                            </button>
                        )}

                        {/* Raise Hand (Student only) */}
                        {!isTeacher && (
                            <button className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all">
                                <Hand size={20} className="text-white" />
                            </button>
                        )}

                        {/* Chat */}
                        <button className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all">
                            <MessageSquare size={20} className="text-white" />
                        </button>

                        {/* Settings */}
                        <button className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all">
                            <Settings size={20} className="text-white" />
                        </button>

                        {/* End Call */}
                        <button
                            onClick={endSession}
                            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all ml-4"
                        >
                            <Phone size={20} className="text-white rotate-135" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Session Info */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="font-bold text-black">Live Session in Progress</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                            <Users size={16} />
                            6 participants
                        </span>
                        <span>Duration: 15:32</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCallSection;
