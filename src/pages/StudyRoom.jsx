// src/pages/StudyRoom.jsx - FIXED VERSION WITH BUG RESOLUTION & ENHANCED UI
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useHMSStore,
    useHMSActions,
    selectIsConnectedToRoom,
    selectPeers,
    selectLocalPeer,
    selectIsPeerAudioEnabled,
    selectIsPeerVideoEnabled,
    HMSRoomProvider,
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
    MessageCircle,
    Send,
    Loader2,
    Clock,
    BookOpen,
    PhoneOff,
    Users,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Maximize2,
    Minimize2,
    Settings,
    Volume2,
    VolumeX,
    Menu,
    X,
    Shield,
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
                        <Shield size={12} className="text-blue-400" />
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

// MAIN ROOM COMPONENT
const StudyRoomContent = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [isJoiningCall, setIsJoiningCall] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showChat, setShowChat] = useState(true);
    const [showParticipants, setShowParticipants] = useState(false);
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
                const roomRef = doc(db, 'rooms', roomId);
                const roomSnap = await getDoc(roomRef);
                
                if (!roomSnap.exists()) {
                    toast.error('Room not found!');
                    navigate('/dashboard?tab=rooms');
                    return;
                }

                setRoomData({ id: roomSnap.id, ...roomSnap.data() });
                setParticipants(roomSnap.data().participants || []);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching room:', error);
                toast.error('Failed to load room');
            }
        };

        if (roomId) fetchRoom();
    }, [roomId, navigate]);

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
                    name: roomData.name || 'Study Room',
                    description: roomData.description || 'Study session'
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
                    role: 'host'
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
    }, [roomData, user, isConnected, isJoiningCall, hmsActions, localPeer, lastLeftTime]);

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
                const roomRef = doc(db, 'rooms', roomId);
                await updateDoc(roomRef, {
                    participants: arrayUnion({
                        userId: user.uid,
                        displayName: user.displayName || 'Anonymous',
                        photoURL: user.photoURL || null,
                        joinedAt: new Date().toISOString(),
                        isOnline: true
                    }),
                    lastActive: serverTimestamp()
                });

                await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                    type: 'system',
                    text: `${user.displayName || 'Someone'} joined the room`,
                    timestamp: serverTimestamp()
                });
            } catch (error) {
                console.error('Error joining Firestore room:', error);
            }
        };

        if (isConnected) {
            joinFirestoreRoom();
        }
    }, [isConnected, roomData, user, roomId]);

    // Listen to chat messages
    useEffect(() => {
        if (!roomId) return;

        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [roomId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !user) return;

        try {
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
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
                const roomRef = doc(db, 'rooms', roomId);
                const participantToRemove = participants.find(p => p.userId === user.uid);
                
                if (participantToRemove) {
                    await updateDoc(roomRef, {
                        participants: arrayRemove(participantToRemove)
                    });
                }

                await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                    type: 'system',
                    text: `${user.displayName || 'Someone'} left the room`,
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

            toast.success('Left study room');
            navigate('/dashboard?tab=rooms', { replace: true });

        } catch (error) {
            console.error('Error leaving room:', error);
            toast.error('Error leaving room');
            navigate('/dashboard?tab=rooms', { replace: true });
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                <div className="text-center backdrop-blur-xl bg-gray-900/50 p-12 rounded-3xl border border-gray-700/50 shadow-2xl">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        <Loader2 size={80} className="text-silver mx-auto mb-8" />
                    </motion.div>
                    <p className="text-2xl font-bold text-white mb-2">Loading Study Room</p>
                    <p className="text-gray-400 font-medium">Preparing your video session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-xl 
                        border border-gray-700/50 rounded-3xl p-6 mb-6 shadow-2xl"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl font-black bg-gradient-to-r from-white via-silver to-gray-400 
                                bg-clip-text text-transparent mb-2">
                                {roomData?.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-gray-300">
                                <span className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 
                                    bg-gray-800/50 rounded-xl border border-gray-700">
                                    <BookOpen size={16} />
                                    {roomData?.topic || 'General Study'}
                                </span>
                                <span className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 
                                    bg-gray-800/50 rounded-xl border border-gray-700">
                                    <Clock size={16} />
                                    <span className="relative flex h-2 w-2">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                                            isConnected ? 'bg-green-500' : isJoiningCall ? 'bg-yellow-500' : 'bg-red-500'
                                        } opacity-75`}></span>
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                            isConnected ? 'bg-green-600' : isJoiningCall ? 'bg-yellow-600' : 'bg-red-600'
                                        }`}></span>
                                    </span>
                                    {isConnected ? 'Live' : isJoiningCall ? 'Connecting...' : 'Disconnected'}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 
                                rounded-2xl border border-gray-700 shadow-lg">
                                <Users size={18} className="text-silver" />
                                <span className="text-white font-bold">{peers.length} Online</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowChat(!showChat)}
                                    className="p-3 bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-xl border border-gray-700 
                                        rounded-2xl transition-all hover:scale-105"
                                >
                                    <MessageCircle size={20} className="text-white" />
                                </button>
                                
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-3 bg-gray-800/50 hover:bg-gray-700/50 backdrop-blur-xl border border-gray-700 
                                        rounded-2xl transition-all hover:scale-105"
                                >
                                    {isFullscreen ? 
                                        <Minimize2 size={20} className="text-white" /> : 
                                        <Maximize2 size={20} className="text-white" />
                                    }
                                </button>
                                
                                <button
                                    onClick={handleLeave}
                                    className="px-6 py-3 bg-gradient-to-r from-red-600 via-red-700 to-red-800 
                                        hover:from-red-700 hover:via-red-800 hover:to-red-900 text-white rounded-2xl 
                                        transition-all flex items-center gap-2 font-bold shadow-lg hover:scale-105"
                                >
                                    <PhoneOff size={18} />
                                    Leave
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="flex gap-6">
                    {/* Main Video Area */}
                    <div className={`transition-all duration-300 ${showChat ? 'flex-1' : 'w-full'}`}>
                        <div 
                            ref={videoContainerRef}
                            className="relative bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden 
                                shadow-2xl border-2 border-gray-700/50 mb-4"
                        >
                            {/* Video Grid */}
                            <div className={`p-4 ${peers.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : ''}`}>
                                {localPeer && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`relative ${peers.length === 1 ? 'h-[calc(100vh-300px)]' : ''} 
                                            ${activeSpeaker === localPeer.id ? 'ring-2 ring-blue-500' : ''}`}
                                    >
                                        <VideoTile peer={localPeer} isLocal={true} isFullscreen={peers.length === 1} />
                                        
                                        {/* Local Controls */}
                                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 
                                            flex items-center gap-3 z-10">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={toggleAudio}
                                                className={`p-4 rounded-2xl transition-all shadow-xl backdrop-blur-xl 
                                                    ${isLocalAudioEnabled 
                                                        ? 'bg-gradient-to-r from-gray-700/80 to-gray-800/80 hover:from-gray-600/80 hover:to-gray-700/80 border border-gray-600' 
                                                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                                                    }`}
                                            >
                                                {isLocalAudioEnabled ? 
                                                    <Mic size={22} className="text-white" /> : 
                                                    <MicOff size={22} className="text-white" />
                                                }
                                            </motion.button>

                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={toggleVideo}
                                                className={`p-4 rounded-2xl transition-all shadow-xl backdrop-blur-xl 
                                                    ${isLocalVideoEnabled 
                                                        ? 'bg-gradient-to-r from-gray-700/80 to-gray-800/80 hover:from-gray-600/80 hover:to-gray-700/80 border border-gray-600' 
                                                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                                                    }`}
                                            >
                                                {isLocalVideoEnabled ? 
                                                    <Video size={22} className="text-white" /> : 
                                                    <VideoOff size={22} className="text-white" />
                                                }
                                            </motion.button>
                                            
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="p-4 rounded-2xl bg-gradient-to-r from-gray-700/80 to-gray-800/80 
                                                    hover:from-gray-600/80 hover:to-gray-700/80 border border-gray-600 
                                                    backdrop-blur-xl shadow-xl"
                                            >
                                                <Settings size={22} className="text-white" />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                )}

                                {peers.filter(p => !p.isLocal).map((peer) => (
                                    <motion.div
                                        key={peer.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`relative ${activeSpeaker === peer.id ? 'ring-2 ring-blue-500' : ''}`}
                                    >
                                        <VideoTile peer={peer} isLocal={false} />
                                    </motion.div>
                                ))}
                            </div>

                            {/* Empty State */}
                            {peers.length === 1 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="text-center p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 
                                        backdrop-blur-xl rounded-3xl border border-gray-700/50">
                                        <Users size={80} className="text-gray-600 mx-auto mb-4" />
                                        <h3 className="text-2xl font-bold text-white mb-2">Waiting for others to join</h3>
                                        <p className="text-gray-400">Share the room link with your study partners</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Sidebar */}
                    <AnimatePresence>
                        {showChat && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="w-96 flex-shrink-0 bg-gradient-to-b from-gray-800/80 to-gray-900/80 
                                    backdrop-blur-xl border border-gray-700/50 rounded-3xl flex flex-col 
                                    h-[calc(100vh-200px)] shadow-2xl"
                            >
                                <div className="p-6 border-b border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-black text-xl flex items-center gap-2">
                                            <MessageCircle size={22} />
                                            Study Chat
                                        </h3>
                                        <button
                                            onClick={() => setShowChat(false)}
                                            className="p-2 hover:bg-gray-700/50 rounded-xl transition-all"
                                        >
                                            <X size={18} className="text-gray-400" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <AnimatePresence>
                                        {messages.map((msg, idx) => (
                                            <motion.div
                                                key={msg.id || idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                {msg.type === 'system' ? (
                                                    <div className="text-center">
                                                        <p className="inline-block px-3 py-1 bg-gray-800/50 text-gray-400 
                                                            text-xs font-medium rounded-full border border-gray-700">
                                                            {msg.text}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] ${msg.senderId === user?.uid ? 'order-2' : 'order-1'}`}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {msg.senderPhoto ? (
                                                                    <img 
                                                                        src={msg.senderPhoto} 
                                                                        alt="" 
                                                                        className="w-7 h-7 rounded-full border-2 border-gray-600" 
                                                                    />
                                                                ) : (
                                                                    <div className="w-7 h-7 bg-gradient-to-br from-silver to-gray-600 
                                                                        rounded-full flex items-center justify-center">
                                                                        <span className="text-white text-xs font-bold">
                                                                            {msg.senderName?.[0]?.toUpperCase() || '?'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <p className="text-xs text-gray-400 font-semibold">
                                                                    {msg.senderId === user?.uid ? 'You' : msg.senderName}
                                                                </p>
                                                            </div>
                                                            <div className={`px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                                                                msg.senderId === user?.uid 
                                                                    ? 'bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white' 
                                                                    : 'bg-gray-800/70 text-gray-100 border border-gray-700/50'
                                                            }`}>
                                                                <p className="text-sm font-medium">{msg.text}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700/50">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Type your message..."
                                            className="flex-1 px-4 py-3 bg-gray-900/50 text-white placeholder-gray-500 
                                                rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 
                                                border border-gray-700 text-sm font-medium backdrop-blur-sm"
                                        />
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            type="submit"
                                            disabled={!messageText.trim()}
                                            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                                                hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl 
                                                transition-all disabled:opacity-30 shadow-xl disabled:cursor-not-allowed"
                                        >
                                            <Send size={18} />
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Mobile Chat Toggle */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowChat(!showChat)}
                className="fixed bottom-6 right-6 md:hidden p-4 bg-gradient-to-r from-blue-600 to-blue-700 
                    text-white rounded-full shadow-2xl z-50"
            >
                <MessageCircle size={24} />
            </motion.button>
        </div>
    );
};

// WRAPPER WITH HMS PROVIDER
const StudyRoom = () => {
    return (
        <HMSRoomProvider>
            <StudyRoomContent />
        </HMSRoomProvider>
    );
};

export default StudyRoom;