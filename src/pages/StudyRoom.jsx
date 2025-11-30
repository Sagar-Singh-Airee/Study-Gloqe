// src/pages/StudyRoom.jsx - FIXED CAMERA CLEANUP & DEBUGS
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { 
    AgoraRTCProvider,
    useRTCClient,
    useLocalCameraTrack,
    useLocalMicrophoneTrack,
    useJoin,
    usePublish,
    useRemoteUsers,
} from 'agora-rtc-react';
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
    Users,
    Send,
    Loader2,
    Clock,
    BookOpen,
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

// ✅ FIXED: Video call component with proper cleanup
const VideoCall = ({ roomId, user, onUserCountChange, onLeave }) => {
    const client = useRTCClient();
    const { localCameraTrack, error: cameraError } = useLocalCameraTrack();
    const { localMicrophoneTrack, error: micError } = useLocalMicrophoneTrack();
    const remoteUsers = useRemoteUsers();
    
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isJoined, setIsJoined] = useState(false);
    
    // Join channel
    const { isLoading, isConnected } = useJoin({
        appid: APP_ID,
        channel: roomId,
        token: null,
        uid: null, // Let Agora assign UID
    }, isJoined);

    // ✅ Set joined state when connected
    useEffect(() => {
        if (isConnected && !isJoined) {
            setIsJoined(true);
            console.log('✅ Successfully joined Agora channel:', roomId);
        }
    }, [isConnected, isJoined, roomId]);

    // Publish local tracks
    usePublish([localMicrophoneTrack, localCameraTrack]);

    // ✅ Handle media errors
    useEffect(() => {
        if (cameraError) {
            console.error('❌ Camera error:', cameraError);
            toast.error('Failed to access camera');
        }
        if (micError) {
            console.error('❌ Microphone error:', micError);
            toast.error('Failed to access microphone');
        }
    }, [cameraError, micError]);

    // Update user count
    useEffect(() => {
        onUserCountChange(remoteUsers.length + 1);
    }, [remoteUsers.length, onUserCountChange]);

    // ✅ FIXED: Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('🧹 Cleaning up media tracks...');
            
            // Close local tracks
            if (localCameraTrack) {
                localCameraTrack.stop();
                localCameraTrack.close();
            }
            if (localMicrophoneTrack) {
                localMicrophoneTrack.stop();
                localMicrophoneTrack.close();
            }
            
            console.log('✅ Media tracks cleaned up');
        };
    }, [localCameraTrack, localMicrophoneTrack]);

    // Toggle video
    const toggleVideo = async () => {
        if (localCameraTrack) {
            await localCameraTrack.setEnabled(!isVideoEnabled);
            setIsVideoEnabled(!isVideoEnabled);
        }
    };

    // Toggle audio
    const toggleAudio = async () => {
        if (localMicrophoneTrack) {
            await localMicrophoneTrack.setEnabled(!isAudioEnabled);
            setIsAudioEnabled(!isAudioEnabled);
        }
    };

    return (
        <div className="space-y-4">
            {/* Local Video */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-gray-900 rounded-2xl overflow-hidden border-2 border-blue-500 aspect-video"
            >
                <div
                    ref={(el) => {
                        if (el && localCameraTrack && isVideoEnabled) {
                            try {
                                localCameraTrack.play(el);
                            } catch (error) {
                                console.error('Error playing local video:', error);
                            }
                        }
                    }}
                    className="w-full h-full bg-gray-900"
                />
                {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-3xl font-bold">
                                {user?.displayName?.[0] || 'Y'}
                            </span>
                        </div>
                    </div>
                )}
                <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-xl">
                    <p className="text-white font-bold">You</p>
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                    {!isVideoEnabled && (
                        <div className="p-2 bg-red-500 rounded-full">
                            <VideoOff size={16} className="text-white" />
                        </div>
                    )}
                    {!isAudioEnabled && (
                        <div className="p-2 bg-red-500 rounded-full">
                            <MicOff size={16} className="text-white" />
                        </div>
                    )}
                    {!isConnected && (
                        <div className="p-2 bg-yellow-500 rounded-full animate-pulse">
                            <Loader2 size={16} className="text-white animate-spin" />
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Remote Videos */}
            <div className="grid grid-cols-2 gap-4">
                {remoteUsers.map((remoteUser, idx) => (
                    <motion.div
                        key={remoteUser.uid}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative bg-gray-900 rounded-2xl overflow-hidden border border-white/10 aspect-video"
                    >
                        <div
                            ref={(el) => {
                                if (el && remoteUser.videoTrack) {
                                    try {
                                        remoteUser.videoTrack.play(el);
                                    } catch (error) {
                                        console.error('Error playing remote video:', error);
                                    }
                                }
                            }}
                            className="w-full h-full bg-gray-900"
                        />
                        {!remoteUser.hasVideo && (
                            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xl font-bold">
                                        {remoteUser.uid?.toString()[0] || 'U'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-xl">
                            <p className="text-white font-bold text-sm">
                                User {remoteUser.uid?.toString().slice(0, 6)}
                            </p>
                        </div>
                        {!remoteUser.hasAudio && (
                            <div className="absolute top-4 right-4 p-2 bg-red-500 rounded-full">
                                <MicOff size={16} className="text-white" />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl">
                <button
                    onClick={toggleAudio}
                    className={`p-4 rounded-xl transition-all ${
                        isAudioEnabled 
                            ? 'bg-white/10 hover:bg-white/20' 
                            : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                    title={isAudioEnabled ? 'Mute' : 'Unmute'}
                >
                    {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-xl transition-all ${
                        isVideoEnabled 
                            ? 'bg-white/10 hover:bg-white/20' 
                            : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                    title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                    {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                </button>
                <button
                    onClick={onLeave}
                    className="p-4 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all"
                    title="Leave room"
                >
                    <PhoneOff size={24} />
                </button>
            </div>
        </div>
    );
};

const StudyRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Room state
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [userCount, setUserCount] = useState(1);
    
    // Chat state
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    
    const chatEndRef = useRef(null);
    const agoraClientRef = useRef(null);
    
    // ✅ Create Agora client only once
    if (!agoraClientRef.current) {
        agoraClientRef.current = AgoraRTC.createClient({ codec: 'vp8', mode: 'rtc' });
    }

    // Fetch room data
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const roomRef = doc(db, 'rooms', roomId);
                const roomSnap = await getDoc(roomRef);
                
                if (!roomSnap.exists()) {
                    toast.error('Room not found!');
                    navigate('/dashboard');
                    return;
                }

                const data = { id: roomSnap.id, ...roomSnap.data() };
                setRoomData(data);
                setParticipants(data.participants || []);
                setLoading(false);
            } catch (error) {
                console.error('❌ Error fetching room:', error);
                toast.error('Failed to load room');
                setLoading(false);
            }
        };

        if (roomId) {
            fetchRoom();
        }
    }, [roomId, navigate]);

    // Join room in Firestore
    useEffect(() => {
        const joinRoom = async () => {
            if (!roomData || !user) return;

            try {
                const roomRef = doc(db, 'rooms', roomId);
                
                await updateDoc(roomRef, {
                    participants: arrayUnion({
                        userId: user.uid,
                        displayName: user.displayName || 'Anonymous',
                        photoURL: user.photoURL || null,
                        joinedAt: new Date().toISOString()
                    })
                });

                await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                    type: 'system',
                    text: `${user.displayName || 'Someone'} joined the room`,
                    timestamp: serverTimestamp()
                });

                console.log('✅ Joined Firestore room');
                toast.success('Joined study room!');
            } catch (error) {
                console.error('❌ Error joining room:', error);
                toast.error('Failed to join room');
            }
        };

        joinRoom();
    }, [roomData, user, roomId]);

    // Listen to messages
    useEffect(() => {
        if (!roomId) return;

        const messagesRef = collection(db, 'rooms', roomId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        }, (error) => {
            console.error('❌ Error listening to messages:', error);
        });

        return () => unsubscribe();
    }, [roomId]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send message
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
            console.error('❌ Error sending message:', error);
            toast.error('Failed to send message');
        }
    };

    // ✅ FIXED: Proper leave with cleanup
    const handleLeave = useCallback(async () => {
        console.log('🚪 Leaving room...');
        
        try {
            // 1. Leave Agora channel first
            if (agoraClientRef.current && agoraClientRef.current.connectionState === 'CONNECTED') {
                await agoraClientRef.current.leave();
                console.log('✅ Left Agora channel');
            }

            // 2. Update Firestore
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
                
                console.log('✅ Updated Firestore');
            }

            toast.success('Left study room');
        } catch (error) {
            console.error('❌ Error leaving room:', error);
        } finally {
            // Always navigate away
            navigate('/dashboard');
        }
    }, [user, roomData, roomId, participants, navigate]);

    // ✅ Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('🧹 Component unmounting, cleaning up...');
            if (agoraClientRef.current && agoraClientRef.current.connectionState === 'CONNECTED') {
                agoraClientRef.current.leave().catch(err => 
                    console.error('Error leaving on unmount:', err)
                );
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <AgoraRTCProvider client={agoraClientRef.current}>
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-white mb-2">
                                    {roomData?.name}
                                </h1>
                                <div className="flex items-center gap-4 text-gray-400">
                                    <span className="flex items-center gap-2">
                                        <BookOpen size={16} />
                                        {roomData?.topic || 'General Study'}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock size={16} />
                                        Active Now
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10">
                                    <Users size={18} className="text-white" />
                                    <span className="text-white font-bold">{userCount}</span>
                                </div>
                                <button
                                    onClick={handleLeave}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-xl transition-all flex items-center gap-2 font-semibold"
                                >
                                    <PhoneOff size={18} />
                                    Leave
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Video Grid */}
                        <div className="lg:col-span-2">
                            <VideoCall 
                                roomId={roomId} 
                                user={user}
                                onUserCountChange={setUserCount}
                                onLeave={handleLeave}
                            />
                        </div>

                        {/* Chat Sidebar */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gradient-to-b from-gray-900/50 to-black/50 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col h-[calc(100vh-200px)]"
                        >
                            <div className="p-4 border-b border-white/10">
                                <h3 className="text-white font-black text-lg flex items-center gap-2">
                                    <MessageCircle size={20} />
                                    Chat
                                </h3>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                <AnimatePresence>
                                    {messages.map((msg, idx) => (
                                        <motion.div
                                            key={msg.id || idx}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                        >
                                            {msg.type === 'system' ? (
                                                <p className="text-center text-gray-500 text-xs italic">
                                                    {msg.text}
                                                </p>
                                            ) : (
                                                <div className={`${
                                                    msg.senderId === user?.uid ? 'ml-auto' : 'mr-auto'
                                                } max-w-[85%]`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {msg.senderPhoto ? (
                                                            <img
                                                                src={msg.senderPhoto}
                                                                alt={msg.senderName}
                                                                className="w-5 h-5 rounded-full"
                                                            />
                                                        ) : (
                                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                                <span className="text-white text-[10px] font-bold">
                                                                    {msg.senderName?.[0] || '?'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <p className="text-[10px] text-gray-400 font-semibold">
                                                            {msg.senderName}
                                                        </p>
                                                    </div>
                                                    <div className={`px-3 py-2 rounded-xl ${
                                                        msg.senderId === user?.uid
                                                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                                                            : 'bg-gray-800 text-gray-100'
                                                    }`}>
                                                        <p className="text-xs font-medium">{msg.text}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="Message..."
                                        className="flex-1 px-3 py-2 bg-gray-800/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10 text-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!messageText.trim()}
                                        className="px-4 py-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </AgoraRTCProvider>
    );
};

export default StudyRoom;
