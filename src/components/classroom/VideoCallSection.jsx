// src/components/classroom/VideoCallSection.jsx - FIXED VERSION
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

// VIDEO TILE COMPONENT
const VideoTile = ({ peer, isLocal, isFullscreen }) => {
    const videoRef = useRef(null);
    const hmsActions = useHMSActions();

    useEffect(() => {
        let cleanupVideo = null;

        if (videoRef.current && peer.videoTrack) {
            hmsActions.attachVideo(peer.videoTrack, videoRef.current);
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

    // Pre-call settings
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

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

    // Fetch room data from Firebase
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const roomRef = doc(db, 'rooms', classId);
                const roomSnap = await getDoc(roomRef);

                if (!roomSnap.exists()) {
                    // Room doesn't exist - this is fine for new classrooms
                    setRoomData({ id: classId, name: 'Classroom Session' });
                    return;
                }

                setRoomData({ id: roomSnap.id, ...roomSnap.data() });
            } catch (error) {
                console.error('Error fetching room:', error);
                setRoomData({ id: classId, name: 'Classroom Session' });
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
        }, (error) => {
            console.log('Messages listener error:', error);
        });

        return () => unsubscribe();
    }, [classId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Start/Join video session
    const startSession = useCallback(async () => {
        if (!user || isConnected || isJoiningCall) return;

        try {
            setIsJoiningCall(true);
            console.log('🔄 Starting video session...');

            // Check if we're re-joining too quickly
            if (lastLeftTime && Date.now() - lastLeftTime < 2000) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Step 1: Create room in 100ms
            const roomResponse = await fetch(`${API_URL}/token/create-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: roomData?.name || 'Classroom Session',
                    description: 'Live class session'
                })
            });

            if (!roomResponse.ok) {
                throw new Error('Failed to create room');
            }

            const roomResult = await roomResponse.json();
            if (!roomResult.success) {
                throw new Error(roomResult.error || 'Failed to create room');
            }

            console.log('✅ Room created:', roomResult.roomId);

            // Step 2: Generate token
            const tokenResponse = await fetch(`${API_URL}/token/generate-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: roomResult.roomId,
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    role: isTeacher ? 'host' : 'guest'
                })
            });

            if (!tokenResponse.ok) {
                throw new Error('Failed to generate token');
            }

            const tokenResult = await tokenResponse.json();
            if (!tokenResult.success) {
                throw new Error(tokenResult.error || 'Failed to generate token');
            }

            console.log('✅ Token generated');

            // Step 3: Join with HMS
            await hmsActions.join({
                userName: user.displayName || 'Anonymous',
                authToken: tokenResult.token,
                settings: {
                    isAudioMuted: !isMicOn,
                    isVideoMuted: !isCameraOn,
                },
            });

            console.log('✅ Joined 100ms room');
            toast.success('Connected to video call!');
            hasJoinedRef.current = true;

        } catch (error) {
            console.error('❌ Error joining video call:', error);
            if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                toast.error('Cannot connect to server. Please check if the backend is running.');
            } else {
                toast.error(error.message || 'Failed to join video call');
            }
            setIsJoiningCall(false);
            hasJoinedRef.current = false;
        }
    }, [roomData, user, isConnected, isJoiningCall, hmsActions, lastLeftTime, isTeacher, isCameraOn, isMicOn]);

    // End/Leave session
    const endSession = useCallback(async () => {
        try {
            // Step 1: Disable local tracks first
            if (hmsActions.setLocalAudioEnabled) {
                await hmsActions.setLocalAudioEnabled(false);
            }
            if (hmsActions.setLocalVideoEnabled) {
                await hmsActions.setLocalVideoEnabled(false);
            }

            // Step 2: Leave the HMS room
            if (isConnected) {
                await hmsActions.leave();
            }

            // Step 3: Update Firestore
            if (user && classId) {
                try {
                    await addDoc(collection(db, 'rooms', classId, 'messages'), {
                        type: 'system',
                        text: `${user.displayName || 'Someone'} left the session`,
                        timestamp: serverTimestamp()
                    });
                } catch (e) {
                    console.log('Could not send leave message:', e);
                }
            }

            // Step 4: Clean up video elements
            const videoElements = document.querySelectorAll('video');
            videoElements.forEach(video => {
                if (video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                }
            });

            setLastLeftTime(Date.now());
            hasJoinedRef.current = false;
            setIsJoiningCall(false);

            toast.success('Left live session');
        } catch (error) {
            console.error('Error leaving room:', error);
            toast.error('Error leaving session');
        }
    }, [isConnected, hmsActions, user, classId]);

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
        } catch (error) {
            console.error('Error toggling audio:', error);
        }
    };

    const toggleVideo = async () => {
        try {
            await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
        } catch (error) {
            console.error('Error toggling video:', error);
        }
    };

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

    // Pre-call UI (not connected yet)
    if (!isConnected) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Preview */}
                <div className="relative bg-gradient-to-br from-gray-900 to-black aspect-video flex items-center justify-center">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative text-center text-white">
                        {isJoiningCall ? (
                            <>
                                <Loader2 size={64} className="mx-auto mb-4 animate-spin" />
                                <h3 className="text-2xl font-black mb-2">Connecting...</h3>
                                <p className="text-gray-400">Please wait while we set up your session</p>
                            </>
                        ) : (
                            <>
                                <Video size={64} className="mx-auto mb-4" />
                                <h3 className="text-2xl font-black mb-2">
                                    {isTeacher ? 'Start Live Session' : 'Join Live Session'}
                                </h3>
                                <p className="text-gray-400">
                                    {isTeacher
                                        ? 'Start a live session to teach your students'
                                        : 'Join the live classroom session'}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                    {/* Pre-call Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setIsCameraOn(!isCameraOn)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${isCameraOn
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
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${isMicOn
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
                    <button
                        onClick={startSession}
                        disabled={isJoiningCall}
                        className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isJoiningCall ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Video size={24} />
                                {isTeacher ? 'Start Live Session' : 'Join Session'}
                            </>
                        )}
                    </button>

                    <p className="text-center text-sm text-gray-500">
                        {isTeacher
                            ? 'Students will be notified when you start'
                            : 'Make sure your camera and microphone are working'}
                    </p>
                </div>
            </div>
        );
    }

    // Active Call UI
    return (
        <div className="space-y-4" ref={videoContainerRef}>
            {/* Main Video Grid */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden">
                {/* Video Grid */}
                <div className={`grid gap-2 p-4 ${peers.length <= 1 ? 'grid-cols-1' :
                        peers.length <= 4 ? 'grid-cols-2' :
                            'grid-cols-2 md:grid-cols-3'
                    }`}>
                    {peers.map((peer) => (
                        <VideoTile
                            key={peer.id}
                            peer={peer}
                            isLocal={peer.id === localPeer?.id}
                            isFullscreen={isFullscreen}
                        />
                    ))}
                </div>

                {/* Control Bar */}
                <div className="bg-black/50 backdrop-blur-xl border-t border-white/10 p-6">
                    <div className="flex items-center justify-center gap-3">
                        {/* Camera Toggle */}
                        <button
                            onClick={toggleVideo}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isLocalVideoEnabled
                                    ? 'bg-gray-700 hover:bg-gray-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                }`}
                        >
                            {isLocalVideoEnabled ? (
                                <Video size={20} className="text-white" />
                            ) : (
                                <VideoOff size={20} className="text-white" />
                            )}
                        </button>

                        {/* Mic Toggle */}
                        <button
                            onClick={toggleAudio}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isLocalAudioEnabled
                                    ? 'bg-gray-700 hover:bg-gray-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                }`}
                        >
                            {isLocalAudioEnabled ? (
                                <Mic size={20} className="text-white" />
                            ) : (
                                <MicOff size={20} className="text-white" />
                            )}
                        </button>

                        {/* Screen Share (Teacher only) */}
                        {isTeacher && (
                            <button
                                onClick={() => toast.info('Screen sharing coming soon!')}
                                className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all"
                            >
                                <Monitor size={20} className="text-white" />
                            </button>
                        )}

                        {/* Raise Hand (Student only) */}
                        {!isTeacher && (
                            <button
                                onClick={() => toast.success('Hand raised!')}
                                className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all"
                            >
                                <Hand size={20} className="text-white" />
                            </button>
                        )}

                        {/* Chat */}
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showChat ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            <MessageSquare size={20} className="text-white" />
                        </button>

                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all"
                        >
                            {isFullscreen ? (
                                <Minimize2 size={20} className="text-white" />
                            ) : (
                                <Maximize2 size={20} className="text-white" />
                            )}
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
                            {peers.length} participant{peers.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chat Panel */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-black">Chat</h3>
                            <button onClick={() => setShowChat(false)}>
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="h-64 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`${msg.type === 'system' ? 'text-center' : ''}`}>
                                    {msg.type === 'system' ? (
                                        <span className="text-xs text-gray-400">{msg.text}</span>
                                    ) : (
                                        <div className={`flex gap-2 ${msg.senderId === user?.uid ? 'justify-end' : ''}`}>
                                            <div className={`max-w-[70%] p-3 rounded-xl ${msg.senderId === user?.uid
                                                    ? 'bg-black text-white'
                                                    : 'bg-gray-100 text-black'
                                                }`}>
                                                <p className="text-xs font-bold mb-1 opacity-70">{msg.senderName}</p>
                                                <p className="text-sm">{msg.text}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex gap-2">
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-black"
                            />
                            <button
                                type="submit"
                                className="p-2 bg-black text-white rounded-xl hover:scale-105 transition-all"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VideoCallSection;
