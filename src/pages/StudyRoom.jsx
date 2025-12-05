// src/pages/StudyRoom.jsx - FIXED HMS LEAVE ERROR
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    selectRoomState,
    selectHMSMessages,
    HMSRoomProvider,
    HMSNotificationTypes,
    useHMSNotifications,
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
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================
// VIDEO TILE COMPONENT
// ============================================

const VideoTile = ({ peer, isLocal, isPinned, onPin, isSpotlight }) => {
    const videoRef = useRef(null);
    const hmsActions = useHMSActions();
    const isConnected = useHMSStore(selectIsConnectedToRoom);
    const isAudioEnabled = useHMSStore(selectIsPeerAudioEnabled(peer?.id));
    const isVideoEnabled = useHMSStore(selectIsPeerVideoEnabled(peer?.id));
    
    useEffect(() => {
        const videoElement = videoRef.current;
        
        // ✅ Only attach if connected and has video track
        if (videoElement && peer?.videoTrack && isConnected) {
            try {
                hmsActions.attachVideo(peer.videoTrack, videoElement);
            } catch (e) {
                console.log('Video attach skipped:', e.message);
            }
        }
        
        return () => {
            // ✅ Safe cleanup
            if (videoElement && peer?.videoTrack) {
                try {
                    hmsActions.detachVideo(peer.videoTrack, videoElement);
                } catch (e) {
                    // Silent cleanup - expected when leaving
                }
            }
            
            if (videoElement?.srcObject) {
                try {
                    videoElement.srcObject.getTracks().forEach(track => track.stop());
                    videoElement.srcObject = null;
                } catch (e) {
                    // Silent cleanup
                }
            }
        };
    }, [peer?.videoTrack, peer?.id, hmsActions, isConnected]);

    const displayName = peer?.name || 'Anonymous';
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`relative bg-gray-900 rounded-2xl overflow-hidden group transition-all duration-300 ${
                isSpotlight ? 'col-span-2 row-span-2' : ''
            } ${isPinned ? 'ring-2 ring-blue-500' : ''}`}
        >
            <video 
                ref={videoRef} 
                autoPlay 
                muted={isLocal}
                playsInline
                className={`w-full h-full object-cover absolute inset-0 ${
                    isLocal ? 'scale-x-[-1]' : ''
                } ${!isVideoEnabled ? 'hidden' : ''}`}
            />
            
            {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                    <div className={`rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ${
                        isSpotlight ? 'w-32 h-32 text-5xl' : 'w-20 h-20 text-3xl'
                    }`}>
                        <span className="font-bold text-white">{initials}</span>
                    </div>
                </div>
            )}

            {peer?.audioLevel > 0 && (
                <div className="absolute inset-0 border-4 border-green-500 rounded-2xl pointer-events-none animate-pulse" />
            )}

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
                        {peer?.roleName === 'host' && (
                            <Shield size={14} className="text-yellow-400" />
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPin?.(peer?.id)}
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

const ControlButton = ({ icon: Icon, label, isActive, isDestructive, onClick, disabled }) => (
    <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={onClick}
        disabled={disabled}
        className={`relative group flex flex-col items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        <div className={`p-4 rounded-full transition-all ${
            isDestructive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : isActive 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-red-400'
        }`}>
            <Icon size={24} />
        </div>
        <span className="text-xs font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5">
            {label}
        </span>
    </motion.button>
);

// ============================================
// PARTICIPANTS PANEL
// ============================================

const ParticipantsPanel = ({ peers, onClose }) => (
    <motion.div
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        className="w-80 bg-white rounded-2xl shadow-2xl flex flex-col h-[calc(100vh-140px)] overflow-hidden"
    >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} />
                Participants ({peers?.length || 0})
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} className="text-gray-500" />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {peers?.map((peer) => (
                <div key={peer.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                                {peer.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">
                                {peer.name} {peer.isLocal && <span className="text-blue-500">(You)</span>}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{peer.roleName || 'Participant'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {!peer.audioEnabled && <MicOff size={16} className="text-red-400" />}
                        {!peer.videoEnabled && <VideoOff size={16} className="text-red-400" />}
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
                                        <div className={`px-4 py-2 rounded-2xl ${
                                            msg.senderId === user?.uid 
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
            toast.success('Link copied!');
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
// MAIN ROOM COMPONENT
// ============================================

const StudyRoomContent = () => {
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
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [pinnedPeer, setPinnedPeer] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    
    // ✅ CRITICAL: Prevent duplicate operations
    const [isLeaving, setIsLeaving] = useState(false);
    const [isTogglingAudio, setIsTogglingAudio] = useState(false);
    const [isTogglingVideo, setIsTogglingVideo] = useState(false);
    
    // Refs
    const hasJoinedRef = useRef(false);
    const lastLeftTimeRef = useRef(null);
    const isMountedRef = useRef(true);
    
    // HMS hooks
    const hmsActions = useHMSActions();
    const isConnected = useHMSStore(selectIsConnectedToRoom);
    const peers = useHMSStore(selectPeers);
    const localPeer = useHMSStore(selectLocalPeer);
    const isLocalAudioEnabled = useHMSStore(selectIsPeerAudioEnabled(localPeer?.id));
    const isLocalVideoEnabled = useHMSStore(selectIsPeerVideoEnabled(localPeer?.id));
    const roomState = useHMSStore(selectRoomState);

    // ============================================
    // ✅ MOUNT/UNMOUNT TRACKING
    // ============================================
    
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ============================================
    // ✅ HMS NOTIFICATION LISTENER - CRITICAL FIX
    // ============================================
    
    const notification = useHMSNotifications();
    
    useEffect(() => {
        if (!notification) return;
        
        // Track when HMS actually disconnects
        if (notification.type === HMSNotificationTypes.ROOM_LEFT) {
            console.log('HMS: Room left notification received');
            hasJoinedRef.current = false;
            lastLeftTimeRef.current = Date.now();
        }
        
        if (notification.type === HMSNotificationTypes.ERROR) {
            console.warn('HMS Error:', notification.data);
            // Don't take action on errors, just log them
        }
        
        if (notification.type === HMSNotificationTypes.RECONNECTING) {
            console.log('HMS: Reconnecting...');
        }
        
        if (notification.type === HMSNotificationTypes.RECONNECTED) {
            console.log('HMS: Reconnected successfully');
        }
    }, [notification]);

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
    // JOIN VIDEO CALL
    // ============================================

    const joinVideoCall = useCallback(async () => {
        // ✅ All guards
        if (!roomData || !user) {
            console.log('Join skipped: No room data or user');
            return;
        }
        if (isConnected) {
            console.log('Join skipped: Already connected');
            return;
        }
        if (isJoiningCall) {
            console.log('Join skipped: Already joining');
            return;
        }
        if (isLeaving) {
            console.log('Join skipped: Currently leaving');
            return;
        }
        // ✅ NEW: Check if component is still mounted
        if (!isMountedRef.current) {
            console.log('Join skipped: Component unmounted');
            return;
        }

        try {
            setIsJoiningCall(true);

            // Cooldown after leaving
            if (lastLeftTimeRef.current && Date.now() - lastLeftTimeRef.current < 3000) {
                console.log('Waiting for cooldown...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Check if still mounted after cooldown
            if (!isMountedRef.current) {
                console.log('Join aborted: Component unmounted during cooldown');
                return;
            }

            // Create/Get Room
            const roomResponse = await fetch(`${API_URL}/token/create-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: roomData.name || 'Study Room',
                    description: roomData.description || 'Study session'
                })
            });

            if (!roomResponse.ok) {
                throw new Error('Failed to create room');
            }
            
            const roomResult = await roomResponse.json();
            if (!roomResult.success) {
                throw new Error(roomResult.error || 'Room creation failed');
            }

            // Check if still mounted
            if (!isMountedRef.current) {
                console.log('Join aborted: Component unmounted after room creation');
                return;
            }

            // Generate Token
            const tokenResponse = await fetch(`${API_URL}/token/generate-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: roomResult.roomId,
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    role: 'host'
                })
            });

            if (!tokenResponse.ok) {
                throw new Error('Failed to generate token');
            }
            
            const tokenResult = await tokenResponse.json();
            if (!tokenResult.success) {
                throw new Error(tokenResult.error || 'Token generation failed');
            }

            // Check if still mounted and not leaving
            if (!isMountedRef.current || isLeaving) {
                console.log('Join aborted: Component state changed');
                return;
            }

            // Join HMS Room
            await hmsActions.join({
                userName: user.displayName || 'Anonymous',
                authToken: tokenResult.token,
                settings: {
                    isAudioMuted: false,
                    isVideoMuted: false,
                },
            });

            if (isMountedRef.current) {
                toast.success('Connected to study room!');
            }

        } catch (error) {
            console.error('Error joining room:', error);
            if (isMountedRef.current) {
                toast.error(error.message || 'Failed to join');
                hasJoinedRef.current = false;
            }
        } finally {
            if (isMountedRef.current) {
                setIsJoiningCall(false);
            }
        }
    }, [roomData, user, isConnected, isJoiningCall, isLeaving, hmsActions]);

    // Auto-join when ready - IMPROVED GUARDS
    useEffect(() => {
        // ✅ Enhanced guards: Don't auto-join if already in a transitional state
        const canAutoJoin = roomData && 
                           user && 
                           !isConnected && 
                           !isJoiningCall && 
                           !hasJoinedRef.current && 
                           !isLeaving &&
                           isMountedRef.current &&
                           roomState !== 'Connecting' &&
                           roomState !== 'Disconnecting';
        
        if (canAutoJoin) {
            console.log('Auto-join: Starting...');
            hasJoinedRef.current = true;
            joinVideoCall();
        } else if (roomData && user && !isConnected) {
            console.log('Auto-join: Waiting...', { 
                isConnected, 
                isJoiningCall, 
                hasJoined: hasJoinedRef.current, 
                isLeaving,
                roomState 
            });
        }
    }, [roomData, user, isConnected, isJoiningCall, isLeaving, roomState, joinVideoCall]);

    // ============================================
    // FIRESTORE LISTENERS
    // ============================================

    useEffect(() => {
        if (!roomId || !user || !isConnected) return;

        const joinFirestore = async () => {
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
                    text: `${user.displayName || 'Someone'} joined`,
                    timestamp: serverTimestamp()
                });
            } catch (error) {
                console.error('Firestore join error:', error);
            }
        };

        joinFirestore();
    }, [isConnected, roomId, user]);

    // Chat messages listener
    useEffect(() => {
        if (!roomId) return;

        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isMountedRef.current) {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        }, (error) => {
            console.error('Messages listener error:', error);
        });

        return () => unsubscribe();
    }, [roomId]);

    // ============================================
    // ✅ CLEANUP ON UNMOUNT - CRITICAL FIX
    // ============================================

    useEffect(() => {
        return () => {
            // Mark as unmounted immediately
            isMountedRef.current = false;
            
            // Only cleanup video elements, DO NOT call HMS leave
            // The handleLeave function handles HMS cleanup properly
            document.querySelectorAll('video').forEach(video => {
                try {
                    if (video.srcObject) {
                        video.srcObject.getTracks().forEach(track => track.stop());
                        video.srcObject = null;
                    }
                } catch (e) {
                    // Silent cleanup
                }
            });
            
            console.log('Component unmounting - video cleanup complete');
        };
    }, []);

    // ============================================
    // HANDLERS
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

    // ✅ SAFE TOGGLE AUDIO
    const toggleAudio = async () => {
        if (!isConnected || isTogglingAudio || isLeaving) return;
        
        try {
            setIsTogglingAudio(true);
            await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
        } catch (error) {
            console.error('Toggle audio error:', error);
            if (isMountedRef.current) {
                toast.error('Failed to toggle microphone');
            }
        } finally {
            if (isMountedRef.current) {
                setIsTogglingAudio(false);
            }
        }
    };

    // ✅ SAFE TOGGLE VIDEO
    const toggleVideo = async () => {
        if (!isConnected || isTogglingVideo || isLeaving) return;
        
        try {
            setIsTogglingVideo(true);
            await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
        } catch (error) {
            console.error('Toggle video error:', error);
            if (isMountedRef.current) {
                toast.error('Failed to toggle camera');
            }
        } finally {
            if (isMountedRef.current) {
                setIsTogglingVideo(false);
            }
        }
    };

    // ============================================
    // ✅ BULLETPROOF HANDLE LEAVE - CRITICAL FIX
    // ============================================

    const handleLeave = async () => {
        // ✅ Prevent duplicate calls
        if (isLeaving) {
            console.log('Leave: Already leaving, ignoring');
            return;
        }

        console.log('Leave: Starting...', { isConnected, roomState });
        setIsLeaving(true);

        try {
            // ✅ CRITICAL: Only call HMS methods if room is actually connected
            // Check BOTH isConnected AND roomState to prevent the inconsistency warning
            const isActuallyConnected = isConnected && (roomState === 'Connected' || roomState === 'Connecting');
            
            if (isActuallyConnected && localPeer) {
                console.log('Leave: Room is connected, performing graceful cleanup...');
                
                // Disable audio
                try {
                    if (localPeer.audioTrack) {
                        await hmsActions.setLocalAudioEnabled(false);
                    }
                } catch (e) {
                    console.log('Leave: Audio disable skipped -', e.message);
                }
                
                // Disable video
                try {
                    if (localPeer.videoTrack) {
                        await hmsActions.setLocalVideoEnabled(false);
                    }
                } catch (e) {
                    console.log('Leave: Video disable skipped -', e.message);
                }

                // Small delay to ensure tracks are disabled
                await new Promise(resolve => setTimeout(resolve, 150));

                // ✅ CRITICAL: Double-check we're still connected before calling leave
                // This prevents the "leave called when no room is connected" error
                const currentState = useHMSStore.getState();
                if (currentState.room) {
                    console.log('Leave: Calling HMS leave()...');
                    try {
                        await hmsActions.leave();
                        console.log('Leave: Successfully left HMS room');
                    } catch (e) {
                        console.log('Leave: HMS leave error (ignoring) -', e.message);
                    }
                } else {
                    console.log('Leave: Room already disconnected, skipping leave()');
                }
            } else {
                console.log('Leave: Not connected, skipping HMS cleanup');
            }

            // Cleanup Firestore
            if (user && roomId) {
                try {
                    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                        type: 'system',
                        text: `${user.displayName || 'Someone'} left`,
                        timestamp: serverTimestamp()
                    });
                    console.log('Leave: Firestore updated');
                } catch (e) {
                    console.log('Leave: Firestore update skipped -', e.message);
                }
            }

            // Cleanup all video elements
            document.querySelectorAll('video').forEach(video => {
                try {
                    if (video.srcObject) {
                        video.srcObject.getTracks().forEach(track => track.stop());
                        video.srcObject = null;
                    }
                } catch (e) {
                    // Silent cleanup
                }
            });

            // Update refs
            lastLeftTimeRef.current = Date.now();
            hasJoinedRef.current = false;

            console.log('Leave: Complete, navigating...');
            toast.success('Left study room');
            navigate('/dashboard?tab=rooms', { replace: true });

        } catch (error) {
            console.error('Leave: Error -', error);
            // Navigate anyway
            navigate('/dashboard?tab=rooms', { replace: true });
        }
        // Note: Don't reset isLeaving since we're navigating away
    };

    const handlePinPeer = (peerId) => {
        setPinnedPeer(pinnedPeer === peerId ? null : peerId);
        setViewMode(pinnedPeer === peerId ? 'grid' : 'spotlight');
    };

    // ============================================
    // COMPUTED VALUES
    // ============================================

    const sortedPeers = useMemo(() => {
        if (!peers) return [];
        
        return [...peers].sort((a, b) => {
            if (a.id === pinnedPeer) return -1;
            if (b.id === pinnedPeer) return 1;
            if (a.isLocal) return -1;
            if (b.isLocal) return 1;
            return 0;
        });
    }, [peers, pinnedPeer]);

    const gridClass = useMemo(() => {
        const count = peers?.length || 1;
        if (viewMode === 'spotlight' && pinnedPeer) return 'grid-cols-1';
        if (count === 1) return 'grid-cols-1';
        if (count === 2) return 'grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 6) return 'grid-cols-3';
        return 'grid-cols-4';
    }, [peers?.length, viewMode, pinnedPeer]);

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
                        <span className={`w-2 h-2 rounded-full ${
                            isConnected ? 'bg-green-500' : 
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
                            {sortedPeers.map((peer) => (
                                <VideoTile
                                    key={peer.id}
                                    peer={peer}
                                    isLocal={peer.isLocal}
                                    isPinned={pinnedPeer === peer.id}
                                    onPin={handlePinPeer}
                                    isSpotlight={viewMode === 'spotlight' && pinnedPeer === peer.id}
                                />
                            ))}
                        </AnimatePresence>
                        
                        {(!peers || peers.length === 0) && (
                            <div className="col-span-full flex items-center justify-center h-full">
                                <div className="text-center">
                                    <Users size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">
                                        {isJoiningCall ? 'Connecting to video...' : 'Waiting for others to join...'}
                                    </p>
                                    {!isJoiningCall && (
                                        <button
                                            onClick={() => setShowShareModal(true)}
                                            className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Invite Participants
                                        </button>
                                    )}
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
                                peers={peers}
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
                            icon={isLocalAudioEnabled ? Mic : MicOff}
                            label={isLocalAudioEnabled ? 'Mute' : 'Unmute'}
                            isActive={isLocalAudioEnabled}
                            onClick={toggleAudio}
                            disabled={!isConnected || isTogglingAudio || isLeaving}
                        />
                        <ControlButton
                            icon={isLocalVideoEnabled ? Video : VideoOff}
                            label={isLocalVideoEnabled ? 'Stop Video' : 'Start Video'}
                            isActive={isLocalVideoEnabled}
                            onClick={toggleVideo}
                            disabled={!isConnected || isTogglingVideo || isLeaving}
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
                            className={`p-3 rounded-full transition-colors ${
                                showParticipants ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            <Users size={20} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setShowChat(!showChat); setShowParticipants(false); }}
                            className={`p-3 rounded-full transition-colors ${
                                showChat ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
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

// ============================================
// WRAPPER WITH HMS PROVIDER
// ============================================

const StudyRoom = () => (
    <HMSRoomProvider>
        <StudyRoomContent />
    </HMSRoomProvider>
);

export default StudyRoom;