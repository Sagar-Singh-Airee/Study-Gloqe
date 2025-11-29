// src/pages/StudyRoom.jsx - WITH REAL VIDEO CALLS
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Peer from 'simple-peer';
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
    setDoc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
    MessageCircle,
    Users,
    Send,
    Loader2,
    LogOut,
    Clock,
    BookOpen,
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    Monitor,
    Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudyRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Room state
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [isJoined, setIsJoined] = useState(false);
    
    // Chat state
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    
    // Video state
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({});
    const [remoteStreams, setRemoteStreams] = useState({});
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    
    // Refs
    const localVideoRef = useRef(null);
    const peersRef = useRef({});
    const chatEndRef = useRef(null);

    // Initialize media stream
    useEffect(() => {
        const initMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: true
                });
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing media:', error);
                toast.error('Failed to access camera/microphone');
            }
        };

        initMedia();

        return () => {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

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
                console.error('Error fetching room:', error);
                toast.error('Failed to load room');
                setLoading(false);
            }
        };

        if (roomId) {
            fetchRoom();
        }
    }, [roomId, navigate]);

    // Join room
    useEffect(() => {
        const joinRoom = async () => {
            if (!roomData || !user || isJoined || !localStream) return;

            try {
                const roomRef = doc(db, 'rooms', roomId);
                
                // Add user to participants
                await updateDoc(roomRef, {
                    participants: arrayUnion({
                        userId: user.uid,
                        displayName: user.displayName || 'Anonymous',
                        photoURL: user.photoURL || null,
                        joinedAt: new Date().toISOString()
                    })
                });

                // Add user signal doc for WebRTC
                await setDoc(doc(db, 'rooms', roomId, 'signals', user.uid), {
                    userId: user.uid,
                    timestamp: serverTimestamp()
                });

                // Add join message
                await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                    type: 'system',
                    text: `${user.displayName || 'Someone'} joined the room`,
                    timestamp: serverTimestamp()
                });

                setIsJoined(true);
                toast.success('Joined study room!');

                // Connect to existing peers
                connectToExistingPeers();
            } catch (error) {
                console.error('Error joining room:', error);
                toast.error('Failed to join room');
            }
        };

        joinRoom();
    }, [roomData, user, roomId, isJoined, localStream]);

    // Connect to existing peers
    const connectToExistingPeers = () => {
        const signalsRef = collection(db, 'rooms', roomId, 'signals');
        
        onSnapshot(signalsRef, (snapshot) => {
            snapshot.docs.forEach((doc) => {
                const peerId = doc.id;
                if (peerId !== user.uid && !peersRef.current[peerId]) {
                    createPeer(peerId, true);
                }
            });
        });

        // Listen for offers
        const offersRef = collection(db, 'rooms', roomId, 'offers');
        onSnapshot(query(offersRef, orderBy('timestamp', 'asc')), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.to === user.uid && !peersRef.current[data.from]) {
                        createPeer(data.from, false, data.offer);
                    }
                }
            });
        });

        // Listen for answers
        const answersRef = collection(db, 'rooms', roomId, 'answers');
        onSnapshot(query(answersRef, orderBy('timestamp', 'asc')), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.to === user.uid && peersRef.current[data.from]) {
                        peersRef.current[data.from].signal(data.answer);
                    }
                }
            });
        });

        // Listen for ICE candidates
        const iceRef = collection(db, 'rooms', roomId, 'ice');
        onSnapshot(iceRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.to === user.uid && peersRef.current[data.from]) {
                        peersRef.current[data.from].signal(data.candidate);
                    }
                }
            });
        });
    };

    // Create peer connection
    const createPeer = (peerId, initiator, offer = null) => {
        const peer = new Peer({
            initiator,
            trickle: true,
            stream: localStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peer.on('signal', async (signal) => {
            if (signal.type === 'offer') {
                await addDoc(collection(db, 'rooms', roomId, 'offers'), {
                    from: user.uid,
                    to: peerId,
                    offer: signal,
                    timestamp: serverTimestamp()
                });
            } else if (signal.type === 'answer') {
                await addDoc(collection(db, 'rooms', roomId, 'answers'), {
                    from: user.uid,
                    to: peerId,
                    answer: signal,
                    timestamp: serverTimestamp()
                });
            } else if (signal.candidate) {
                await addDoc(collection(db, 'rooms', roomId, 'ice'), {
                    from: user.uid,
                    to: peerId,
                    candidate: signal,
                    timestamp: serverTimestamp()
                });
            }
        });

        peer.on('stream', (stream) => {
            setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
        });

        peer.on('close', () => {
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[peerId];
                return newStreams;
            });
        });

        if (offer) {
            peer.signal(offer);
        }

        peersRef.current[peerId] = peer;
        setPeers(prev => ({ ...prev, [peerId]: peer }));
    };

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
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        }
    };

    // Toggle video
    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    // Toggle audio
    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    // Leave room
    const handleLeave = async () => {
        try {
            // Stop all tracks
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            // Close all peer connections
            Object.values(peersRef.current).forEach(peer => peer.destroy());

            if (user && roomData) {
                const roomRef = doc(db, 'rooms', roomId);
                
                // Remove from participants
                await updateDoc(roomRef, {
                    participants: arrayRemove(
                        participants.find(p => p.userId === user.uid)
                    )
                });

                // Delete signal doc
                await deleteDoc(doc(db, 'rooms', roomId, 'signals', user.uid));

                // Add leave message
                await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                    type: 'system',
                    text: `${user.displayName || 'Someone'} left the room`,
                    timestamp: serverTimestamp()
                });
            }

            toast.success('Left study room');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error leaving room:', error);
            navigate('/dashboard');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
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
                                <span className="text-white font-bold">{Object.keys(remoteStreams).length + 1}</span>
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
                    <div className="lg:col-span-2 space-y-4">
                        {/* Local Video */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative bg-gray-900 rounded-2xl overflow-hidden border-2 border-blue-500 aspect-video"
                        >
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
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
                            </div>
                        </motion.div>

                        {/* Remote Videos */}
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(remoteStreams).map(([peerId, stream], idx) => (
                                <motion.div
                                    key={peerId}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative bg-gray-900 rounded-2xl overflow-hidden border border-white/10 aspect-video"
                                >
                                    <video
                                        autoPlay
                                        playsInline
                                        ref={(el) => {
                                            if (el) el.srcObject = stream;
                                        }}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/70 backdrop-blur-sm rounded-xl">
                                        <p className="text-white font-bold text-sm">
                                            {participants.find(p => p.userId === peerId)?.displayName || 'User'}
                                        </p>
                                    </div>
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
                            >
                                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                            </button>
                            <button
                                onClick={handleLeave}
                                className="p-4 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all"
                            >
                                <PhoneOff size={24} />
                            </button>
                        </div>
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
    );
};

export default StudyRoom;
