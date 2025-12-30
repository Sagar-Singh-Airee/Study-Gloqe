// src/pages/StudyRoom.jsx - AGORA SDK VERSION
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AgoraRTC from 'agora-rtc-sdk-ng';
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
    increment,
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import {
    MessageCircle,
    Send,
    Loader2,
    PhoneOff,
    Users,
    Mic,
    MicOff,
    Video,
    VideoOff,
    X,
    Shield,
    Copy,
    Check,
    Pin,
    PinOff,
    UserPlus,
    Volume2,
    VolumeX,
    Settings,
    ScreenShare,
    ScreenShareOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================
// CONFIGURATION
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID;

// Configure Agora SDK
AgoraRTC.setLogLevel(3); // Warning level only

// ============================================
// AGORA CLIENT SINGLETON
// ============================================

let agoraClient = null;

const getAgoraClient = () => {
    if (!agoraClient) {
        agoraClient = AgoraRTC.createClient({
            mode: 'rtc',
            codec: 'vp8'
        });
    }
    return agoraClient;
};

// ============================================
// VIDEO TILE COMPONENT
// ============================================

const VideoTile = ({
    user,
    isLocal,
    isPinned,
    onPin,
    isSpotlight,
    audioTrack,
    videoTrack,
    isAudioEnabled,
    isVideoEnabled,
}) => {
    const videoRef = useRef(null);
    const [audioLevel, setAudioLevel] = useState(0);

    // Play video track
    useEffect(() => {
        const container = videoRef.current;
        if (!container) return;

        if (videoTrack && isVideoEnabled) {
            videoTrack.play(container, { fit: 'cover', mirror: isLocal });
        }

        return () => {
            if (videoTrack) {
                try {
                    videoTrack.stop();
                } catch (e) {
                    // Silent cleanup
                }
            }
        };
    }, [videoTrack, isVideoEnabled, isLocal]);

    // Audio level indicator
    useEffect(() => {
        if (!audioTrack || !isAudioEnabled) {
            setAudioLevel(0);
            return;
        }

        const interval = setInterval(() => {
            const level = audioTrack.getVolumeLevel?.() || 0;
            setAudioLevel(level);
        }, 100);

        return () => clearInterval(interval);
    }, [audioTrack, isAudioEnabled]);

    const displayName = user?.name || 'Anonymous';
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`relative bg-gray-900 rounded-2xl overflow-hidden group transition-all duration-300 ${isSpotlight ? 'col-span-2 row-span-2' : ''
                } ${isPinned ? 'ring-2 ring-blue-500' : ''}`}
        >
            {/* Video Container */}
            <div
                ref={videoRef}
                className={`w-full h-full absolute inset-0 ${!isVideoEnabled ? 'hidden' : ''}`}
            />

            {/* Avatar when video is off */}
            {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${isSpotlight ? 'w-32 h-32 text-5xl' : 'w-20 h-20 text-3xl'
                        }`}>
                        <span className="font-bold text-white">{initials}</span>
                    </div>
                </div>
            )}

            {/* Audio Level Indicator */}
            {audioLevel > 0.1 && (
                <div className="absolute inset-0 border-4 border-green-500 rounded-2xl pointer-events-none animate-pulse" />
            )}

            {/* Status Indicators */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
                {!isAudioEnabled && (
                    <div className="p-2 bg-red-500 rounded-full shadow-lg">
                        <MicOff size={14} className="text-white" />
                    </div>
                )}
                {isPinned && (
                    <div className="p-2 bg-blue-500 rounded-full shadow-lg">
                        <Pin size={14} className="text-white" />
                    </div>
                )}
            </div>

            {/* Name Badge */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm truncate max-w-[150px]">
                            {displayName}
                        </span>
                        {isLocal && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium">
                                You
                            </span>
                        )}
                        {user?.isHost && (
                            <Shield size={14} className="text-yellow-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Hover Controls */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPin?.(user?.uid)}
                        className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all"
                    >
                        {isPinned ? <PinOff size={20} className="text-white" /> : <Pin size={20} className="text-white" />}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

// ============================================
// CONTROL BUTTON COMPONENT
// ============================================

const ControlButton = ({ icon: Icon, label, isActive, isDestructive, onClick, disabled, badge }) => (
    <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={onClick}
        disabled={disabled}
        className="relative group flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
        <div className={`p-4 rounded-full transition-all ${isDestructive
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : isActive
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-red-400'
            }`}>
            <Icon size={24} />
            {badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {badge}
                </span>
            )}
        </div>
        <span className="text-xs font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5">
            {label}
        </span>
    </motion.button>
);

// ============================================
// PARTICIPANTS PANEL
// ============================================

const ParticipantsPanel = ({ participants, localUid, onClose }) => (
    <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="w-80 bg-white rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-140px)] overflow-hidden"
    >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                Participants ({participants?.length || 0})
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} className="text-gray-500" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {participants?.map((participant) => (
                <div key={participant.uid} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                                {participant.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">
                                {participant.name} {participant.uid === localUid && <span className="text-blue-500">(You)</span>}
                            </p>
                            <p className="text-xs text-gray-500">
                                {participant.isHost ? 'Host' : 'Participant'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {!participant.hasAudio && <MicOff size={16} className="text-red-400" />}
                        {!participant.hasVideo && <VideoOff size={16} className="text-red-400" />}
                    </div>
                </div>
            ))}
        </div>
    </motion.div>
);

// ============================================
// CHAT PANEL
// ============================================

const ChatPanel = ({ messages, messageText, setMessageText, onSendMessage, user, onClose }) => {
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 bg-white rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-140px)] overflow-hidden"
        >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <MessageCircle size={20} />
                    In-call Messages
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={18} className="text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <MessageCircle size={40} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No messages yet</p>
                        <p className="text-gray-400 text-xs">Messages are only visible to people in the call</p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={msg.id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {msg.type === 'system' ? (
                                <p className="text-center text-xs text-gray-400 py-2">{msg.text}</p>
                            ) : (
                                <div className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] ${msg.senderId === user?.uid ? 'order-2' : 'order-1'}`}>
                                        {msg.senderId !== user?.uid && (
                                            <p className="text-xs text-gray-500 font-medium mb-1 ml-1">{msg.senderName}</p>
                                        )}
                                        <div className={`px-4 py-2 rounded-2xl ${msg.senderId === user?.uid
                                            ? 'bg-blue-500 text-white rounded-tr-sm'
                                            : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-tl-sm'
                                            }`}>
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={onSendMessage} className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Send a message..."
                        className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-none"
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={!messageText.trim()}
                        className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

// ============================================
// SHARE MODAL
// ============================================

const ShareModal = ({ roomId, onClose }) => {
    const [copied, setCopied] = useState(false);
    const shareLink = `${window.location.origin}/study-room/${roomId}`;
    const classCode = roomId?.substring(0, 8).toUpperCase();

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            toast.error('Failed to copy');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
                <h2 className="text-2xl font-black text-gray-900 mb-6">Share this Study Room</h2>

                <div className="mb-6">
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Room Code</label>
                    <div className="bg-gray-100 p-6 rounded-2xl text-center">
                        <p className="text-4xl font-mono font-black text-gray-900 tracking-widest">{classCode}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="text-sm font-semibold text-gray-600 mb-2 block">Or share this link</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={shareLink}
                            readOnly
                            className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-700 font-mono truncate"
                        />
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={copyLink}
                            className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                            {copied ? 'Copied' : 'Copy'}
                        </motion.button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                    Done
                </button>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// MAIN STUDY ROOM COMPONENT
// ============================================

const StudyRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // ============================================
    // STATE
    // ============================================

    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [isJoiningCall, setIsJoiningCall] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [pinnedPeer, setPinnedPeer] = useState(null);
    const [viewMode, setViewMode] = useState('grid');

    // Media state
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Tracks
    const [localAudioTrack, setLocalAudioTrack] = useState(null);
    const [localVideoTrack, setLocalVideoTrack] = useState(null);
    const [screenTrack, setScreenTrack] = useState(null);

    // Remote users
    const [remoteUsers, setRemoteUsers] = useState([]);

    // Operation guards
    const [isLeaving, setIsLeaving] = useState(false);
    const [isTogglingAudio, setIsTogglingAudio] = useState(false);
    const [isTogglingVideo, setIsTogglingVideo] = useState(false);

    // Refs
    const isMountedRef = useRef(true);
    const clientRef = useRef(null);
    const localUidRef = useRef(null);

    // ============================================
    // MOUNT/UNMOUNT TRACKING
    // ============================================

    useEffect(() => {
        isMountedRef.current = true;
        const startTime = Date.now();

        return () => {
            isMountedRef.current = false;

            // Log session duration on unmount
            const duration = (Date.now() - startTime) / 1000 / 60; // in minutes
            if (duration >= 1 && user?.uid) {
                const userRef = doc(db, 'users', user.uid);
                updateDoc(userRef, {
                    totalTimeInRooms: increment(Math.round(duration)),
                    roomsJoined: increment(1)
                }).catch(err => console.error('Failed to log room stats:', err));
            }
        };
    }, [user]);

    // ============================================
    // FETCH ROOM DATA
    // ============================================

    useEffect(() => {
        const fetchRoom = async () => {
            if (!roomId) return;

            try {
                const roomRef = doc(db, 'rooms', roomId);
                const roomSnap = await getDoc(roomRef);

                if (!roomSnap.exists()) {
                    toast.error('Room not found!');
                    navigate('/dashboard?tab=rooms');
                    return;
                }

                if (isMountedRef.current) {
                    setRoomData({ id: roomSnap.id, ...roomSnap.data() });
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching room:', error);
                toast.error('Failed to load room');
                navigate('/dashboard?tab=rooms');
            }
        };

        fetchRoom();
    }, [roomId, navigate]);

    // ============================================
    // AGORA EVENT HANDLERS
    // ============================================

    const setupAgoraListeners = useCallback((client) => {
        // User published (started sharing audio/video)
        client.on('user-published', async (remoteUser, mediaType) => {
            await client.subscribe(remoteUser, mediaType);
            console.log('Subscribed to', remoteUser.uid, mediaType);

            if (mediaType === 'audio') {
                remoteUser.audioTrack?.play();
            }

            setRemoteUsers(prev => {
                const exists = prev.find(u => u.uid === remoteUser.uid);
                if (exists) {
                    return prev.map(u =>
                        u.uid === remoteUser.uid
                            ? { ...u, [mediaType + 'Track']: remoteUser[mediaType + 'Track'], ['has' + mediaType.charAt(0).toUpperCase() + mediaType.slice(1)]: true }
                            : u
                    );
                }
                return [...prev, {
                    uid: remoteUser.uid,
                    name: `User ${remoteUser.uid}`,
                    audioTrack: remoteUser.audioTrack,
                    videoTrack: remoteUser.videoTrack,
                    hasAudio: mediaType === 'audio',
                    hasVideo: mediaType === 'video',
                }];
            });
        });

        // User unpublished (stopped sharing)
        client.on('user-unpublished', (remoteUser, mediaType) => {
            console.log('User unpublished:', remoteUser.uid, mediaType);

            setRemoteUsers(prev =>
                prev.map(u =>
                    u.uid === remoteUser.uid
                        ? { ...u, [mediaType + 'Track']: null, ['has' + mediaType.charAt(0).toUpperCase() + mediaType.slice(1)]: false }
                        : u
                )
            );
        });

        // User left
        client.on('user-left', (remoteUser) => {
            console.log('User left:', remoteUser.uid);
            setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
        });

        // Connection state change
        client.on('connection-state-change', (curState, prevState) => {
            console.log('Connection state:', prevState, '->', curState);
            if (curState === 'CONNECTED') {
                setIsConnected(true);
            } else if (curState === 'DISCONNECTED') {
                setIsConnected(false);
            }
        });

        // Token will expire
        client.on('token-privilege-will-expire', async () => {
            console.log('Token expiring, fetching new token...');
            try {
                const response = await fetch(`${API_URL}/token/study-room`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId, userId: localUidRef.current })
                });
                const data = await response.json();
                if (data.success) {
                    await client.renewToken(data.token);
                    console.log('Token renewed successfully');
                }
            } catch (error) {
                console.error('Failed to renew token:', error);
            }
        });
    }, [roomId]);

    // ============================================
    // JOIN VIDEO CALL
    // ============================================

    const joinVideoCall = useCallback(async () => {
        if (!roomData || !user || isConnected || isJoiningCall || isLeaving || !isMountedRef.current) {
            return;
        }

        try {
            setIsJoiningCall(true);
            console.log('Joining Agora room...');

            // Get Agora client
            const client = getAgoraClient();
            clientRef.current = client;

            // Setup event listeners
            setupAgoraListeners(client);

            // Get token from server
            const tokenResponse = await fetch(`${API_URL}/token/study-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: roomId,
                    userId: Math.floor(Math.random() * 100000), // Numeric UID for Agora
                })
            });

            if (!tokenResponse.ok) {
                throw new Error('Failed to get token');
            }

            const tokenData = await tokenResponse.json();
            if (!tokenData.success) {
                throw new Error(tokenData.error || 'Token generation failed');
            }

            console.log('Token received, joining channel:', tokenData.channelName);

            // Check if still mounted
            if (!isMountedRef.current) {
                console.log('Component unmounted, aborting join');
                return;
            }

            // Join the channel
            const uid = await client.join(
                tokenData.appId || AGORA_APP_ID,
                tokenData.channelName,
                tokenData.token,
                tokenData.uid
            );

            localUidRef.current = uid;
            console.log('Joined with UID:', uid);

            // Create and publish local tracks
            const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
                { encoderConfig: 'speech_standard' },
                { encoderConfig: '720p_2' }
            );

            if (!isMountedRef.current) {
                audioTrack.close();
                videoTrack.close();
                await client.leave();
                return;
            }

            setLocalAudioTrack(audioTrack);
            setLocalVideoTrack(videoTrack);

            // Publish tracks
            await client.publish([audioTrack, videoTrack]);
            console.log('Published local tracks');

            setIsConnected(true);

            // Update Firestore
            await updateDoc(doc(db, 'rooms', roomId), {
                participants: arrayUnion({
                    odUserId: user.uid,
                    displayName: user.displayName || 'Anonymous',
                    photoURL: user.photoURL || null,
                    joinedAt: new Date().toISOString(),
                    isOnline: true,
                    agoraUid: uid,
                }),
                lastActive: serverTimestamp()
            });

            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                type: 'system',
                text: `${user.displayName || 'Someone'} joined`,
                timestamp: serverTimestamp()
            });

            if (isMountedRef.current) {
                toast.success('Connected to study room!');
            }

        } catch (error) {
            console.error('Error joining room:', error);
            if (isMountedRef.current) {
                toast.error(error.message || 'Failed to join room');
            }
        } finally {
            if (isMountedRef.current) {
                setIsJoiningCall(false);
            }
        }
    }, [roomData, user, isConnected, isJoiningCall, isLeaving, roomId, setupAgoraListeners]);

    // Auto-join when ready
    useEffect(() => {
        if (roomData && user && !isConnected && !isJoiningCall && !isLeaving && isMountedRef.current) {
            joinVideoCall();
        }
    }, [roomData, user, isConnected, isJoiningCall, isLeaving, joinVideoCall]);

    // ============================================
    // CHAT MESSAGES LISTENER
    // ============================================

    useEffect(() => {
        if (!roomId) return;

        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isMountedRef.current) {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    // ============================================
    // TOGGLE AUDIO
    // ============================================

    const toggleAudio = async () => {
        if (!isConnected || isTogglingAudio || isLeaving || !localAudioTrack) return;

        try {
            setIsTogglingAudio(true);
            await localAudioTrack.setEnabled(!isAudioEnabled);
            setIsAudioEnabled(!isAudioEnabled);
        } catch (error) {
            console.error('Toggle audio error:', error);
            toast.error('Failed to toggle microphone');
        } finally {
            setIsTogglingAudio(false);
        }
    };

    // ============================================
    // TOGGLE VIDEO
    // ============================================

    const toggleVideo = async () => {
        if (!isConnected || isTogglingVideo || isLeaving || !localVideoTrack) return;

        try {
            setIsTogglingVideo(true);
            await localVideoTrack.setEnabled(!isVideoEnabled);
            setIsVideoEnabled(!isVideoEnabled);
        } catch (error) {
            console.error('Toggle video error:', error);
            toast.error('Failed to toggle camera');
        } finally {
            setIsTogglingVideo(false);
        }
    };

    // ============================================
    // SCREEN SHARE
    // ============================================

    const toggleScreenShare = async () => {
        if (!isConnected || isLeaving) return;

        try {
            const client = clientRef.current;

            if (isScreenSharing && screenTrack) {
                await client.unpublish(screenTrack);
                screenTrack.close();
                setScreenTrack(null);
                setIsScreenSharing(false);

                // Re-publish video track
                if (localVideoTrack) {
                    await client.publish(localVideoTrack);
                }
                toast.success('Stopped screen sharing');
            } else {
                // Create screen track
                const screen = await AgoraRTC.createScreenVideoTrack({
                    encoderConfig: '1080p_1',
                    optimizationMode: 'detail',
                });

                // Unpublish video track first
                if (localVideoTrack) {
                    await client.unpublish(localVideoTrack);
                }

                await client.publish(screen);
                setScreenTrack(screen);
                setIsScreenSharing(true);

                // Handle when user stops sharing via browser
                screen.on('track-ended', async () => {
                    await client.unpublish(screen);
                    screen.close();
                    setScreenTrack(null);
                    setIsScreenSharing(false);

                    if (localVideoTrack) {
                        await client.publish(localVideoTrack);
                    }
                });

                toast.success('Started screen sharing');
            }
        } catch (error) {
            console.error('Screen share error:', error);
            if (error.message?.includes('Permission denied')) {
                toast.error('Screen share permission denied');
            } else {
                toast.error('Failed to share screen');
            }
        }
    };

    // ============================================
    // LEAVE ROOM
    // ============================================

    const handleLeave = async () => {
        if (isLeaving) return;

        setIsLeaving(true);
        console.log('Leaving room...');

        try {
            const client = clientRef.current;

            // Close local tracks
            if (localAudioTrack) {
                localAudioTrack.close();
                setLocalAudioTrack(null);
            }
            if (localVideoTrack) {
                localVideoTrack.close();
                setLocalVideoTrack(null);
            }
            if (screenTrack) {
                screenTrack.close();
                setScreenTrack(null);
            }

            // Leave Agora channel
            if (client) {
                await client.leave();
                console.log('Left Agora channel');
            }

            // Update Firestore
            if (user && roomId) {
                try {
                    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                        type: 'system',
                        text: `${user.displayName || 'Someone'} left`,
                        timestamp: serverTimestamp()
                    });
                } catch (e) {
                    console.log('Firestore update skipped');
                }
            }

            setIsConnected(false);
            setRemoteUsers([]);

            toast.success('Left study room');
            navigate('/dashboard?tab=rooms', { replace: true });

        } catch (error) {
            console.error('Leave error:', error);
            navigate('/dashboard?tab=rooms', { replace: true });
        }
    };

    // ============================================
    // CLEANUP ON UNMOUNT
    // ============================================

    useEffect(() => {
        return () => {
            isMountedRef.current = false;

            // Cleanup tracks
            if (localAudioTrack) localAudioTrack.close();
            if (localVideoTrack) localVideoTrack.close();
            if (screenTrack) screenTrack.close();

            // Leave channel
            if (clientRef.current) {
                clientRef.current.leave().catch(() => { });
            }
        };
    }, []);

    // ============================================
    // SEND MESSAGE
    // ============================================

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
            console.error('Send message error:', error);
            toast.error('Failed to send message');
        }
    };

    // ============================================
    // PIN PEER
    // ============================================

    const handlePinPeer = (peerId) => {
        setPinnedPeer(pinnedPeer === peerId ? null : peerId);
        setViewMode(pinnedPeer === peerId ? 'grid' : 'spotlight');
    };

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const allParticipants = useMemo(() => {
        const local = {
            uid: localUidRef.current,
            name: user?.displayName || 'You',
            isLocal: true,
            isHost: roomData?.hostId === user?.uid,
            hasAudio: isAudioEnabled,
            hasVideo: isVideoEnabled,
            audioTrack: localAudioTrack,
            videoTrack: isScreenSharing ? screenTrack : localVideoTrack,
        };

        const remote = remoteUsers.map(u => ({
            ...u,
            isLocal: false,
            isHost: false,
        }));

        return [local, ...remote].filter(p => p.uid);
    }, [user, roomData, isAudioEnabled, isVideoEnabled, localAudioTrack, localVideoTrack, screenTrack, isScreenSharing, remoteUsers]);

    const sortedParticipants = useMemo(() => {
        return [...allParticipants].sort((a, b) => {
            if (a.uid === pinnedPeer) return -1;
            if (b.uid === pinnedPeer) return 1;
            if (a.isLocal) return -1;
            if (b.isLocal) return 1;
            return 0;
        });
    }, [allParticipants, pinnedPeer]);

    const gridClass = useMemo(() => {
        const count = allParticipants.length;
        if (viewMode === 'spotlight' && pinnedPeer) return 'grid-cols-1';
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 6) return 'grid-cols-3';
        return 'grid-cols-4';
    }, [allParticipants.length, viewMode, pinnedPeer]);

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-white font-semibold text-lg">Joining study room...</p>
                    <p className="text-gray-400 text-sm mt-1">Setting up your video</p>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">

            {/* TOP BAR */}
            <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <h1 className="text-white font-bold text-lg truncate max-w-[200px]">
                        {roomData?.name || 'Study Room'}
                    </h1>
                    <div className="hidden md:flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' :
                            isJoiningCall ? 'bg-yellow-500 animate-pulse' :
                                'bg-red-500'
                            }`} />
                        <span className="text-gray-400 text-sm">
                            {isConnected ? 'Connected' : isJoiningCall ? 'Connecting...' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm font-medium hidden md:block">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="h-4 w-px bg-gray-700 hidden md:block" />
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                        <UserPlus size={16} />
                        <span className="hidden md:inline">Share</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">

                {/* VIDEO GRID */}
                <div className="flex-1 p-4 overflow-auto">
                    <div className={`grid ${gridClass} gap-4 h-full auto-rows-fr`}>
                        <AnimatePresence>
                            {sortedParticipants.map((participant) => (
                                <VideoTile
                                    key={participant.uid}
                                    user={participant}
                                    isLocal={participant.isLocal}
                                    isPinned={pinnedPeer === participant.uid}
                                    onPin={handlePinPeer}
                                    isSpotlight={viewMode === 'spotlight' && pinnedPeer === participant.uid}
                                    audioTrack={participant.audioTrack}
                                    videoTrack={participant.videoTrack}
                                    isAudioEnabled={participant.hasAudio}
                                    isVideoEnabled={participant.hasVideo}
                                />
                            ))}
                        </AnimatePresence>

                        {allParticipants.length === 0 && (
                            <div className="col-span-full flex items-center justify-center h-full">
                                <div className="text-center">
                                    <Users size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">
                                        {isJoiningCall ? 'Connecting to video...' : 'Waiting for others to join...'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SIDE PANELS */}
                <AnimatePresence>
                    {showChat && (
                        <div className="flex-shrink-0 p-4 pl-0">
                            <ChatPanel
                                messages={messages}
                                messageText={messageText}
                                setMessageText={setMessageText}
                                onSendMessage={handleSendMessage}
                                user={user}
                                onClose={() => setShowChat(false)}
                            />
                        </div>
                    )}
                    {showParticipants && (
                        <div className="flex-shrink-0 p-4 pl-0">
                            <ParticipantsPanel
                                participants={allParticipants}
                                localUid={localUidRef.current}
                                onClose={() => setShowParticipants(false)}
                            />
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM CONTROLS */}
            <div className="flex-shrink-0 px-4 py-4 bg-gray-900 border-t border-gray-800">
                <div className="flex items-center justify-between max-w-4xl mx-auto">

                    <div className="flex items-center gap-4 flex-1">
                        <div className="hidden md:block">
                            <p className="text-gray-500 text-xs">Room Code</p>
                            <p className="text-white font-mono font-bold">{roomId?.substring(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <ControlButton
                            icon={isAudioEnabled ? Mic : MicOff}
                            label={isAudioEnabled ? 'Mute' : 'Unmute'}
                            isActive={isAudioEnabled}
                            onClick={toggleAudio}
                            disabled={!isConnected || isTogglingAudio || isLeaving}
                        />
                        <ControlButton
                            icon={isVideoEnabled ? Video : VideoOff}
                            label={isVideoEnabled ? 'Stop Video' : 'Start Video'}
                            isActive={isVideoEnabled}
                            onClick={toggleVideo}
                            disabled={!isConnected || isTogglingVideo || isLeaving}
                        />
                        <ControlButton
                            icon={isScreenSharing ? ScreenShareOff : ScreenShare}
                            label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
                            isActive={isScreenSharing}
                            onClick={toggleScreenShare}
                            disabled={!isConnected || isLeaving}
                        />
                        <ControlButton
                            icon={PhoneOff}
                            label="Leave"
                            isDestructive
                            onClick={handleLeave}
                            disabled={isLeaving}
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }}
                            className={`relative p-3 rounded-full transition-colors ${showParticipants ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            <Users size={20} />
                            {allParticipants.length > 1 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {allParticipants.length}
                                </span>
                            )}
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
                            className={`p-3 rounded-full transition-colors ${showChat ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            <MessageCircle size={20} />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* SHARE MODAL */}
            <AnimatePresence>
                {showShareModal && (
                    <ShareModal
                        roomId={roomId}
                        onClose={() => setShowShareModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyRoom;
