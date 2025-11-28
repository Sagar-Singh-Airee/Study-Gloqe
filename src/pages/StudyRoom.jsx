// src/pages/StudyRoom.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    MessageCircle,
    Users,
    Maximize,
    Settings,
    Send,
    X,
    Loader2
} from 'lucide-react';

const StudyRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [messageText, setMessageText] = useState('');
    const localVideoRef = useRef(null);
    const remoteVideosRef = useRef(new Map());
    const chatEndRef = useRef(null);

    const {
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        peers,
        messages,
        isConnected,
        joinRoom,
        leaveRoom,
        toggleAudio,
        toggleVideo,
        sendMessage
    } = useWebRTC(roomId, currentUser?.uid, currentUser?.displayName || 'Anonymous');

    // Fetch room data
    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const roomRef = doc(db, 'rooms', roomId);
                const roomSnap = await getDoc(roomRef);
                
                if (!roomSnap.exists()) {
                    alert('Room not found!');
                    navigate('/dashboard');
                    return;
                }

                setRoomData({ id: roomSnap.id, ...roomSnap.data() });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching room:', error);
                setLoading(false);
            }
        };

        fetchRoom();
    }, [roomId, navigate]);

    // Join room on mount
    useEffect(() => {
        if (roomData && currentUser && !isConnected) {
            joinRoom().catch((error) => {
                console.error('Failed to join room:', error);
                navigate('/dashboard');
            });
        }

        return () => {
            if (isConnected) {
                leaveRoom();
            }
        };
    }, [roomData, currentUser]); // Intentionally limited deps

    // Attach local stream to video element
    useEffect(() => {
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote streams to video elements
    useEffect(() => {
        remoteStreams.forEach((stream, userId) => {
            const videoElement = remoteVideosRef.current.get(userId);
            if (videoElement) {
                videoElement.srcObject = stream;
            }
        });
    }, [remoteStreams]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle send message
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (messageText.trim()) {
            sendMessage(messageText.trim());
            setMessageText('');
        }
    };

    // Handle leave
    const handleLeave = async () => {
        await leaveRoom();
        navigate('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-white">
                        <h1 className="text-2xl font-bold">{roomData?.name}</h1>
                        <p className="text-gray-400 text-sm">{roomData?.topic}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl">
                            <Users size={18} className="text-white" />
                            <span className="text-white font-semibold">{peers.length + 1}</span>
                        </div>
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {/* Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* Local Video */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="aspect-video bg-gray-900 rounded-2xl relative overflow-hidden border-2 border-blue-500"
                    >
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        {!isVideoEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                                    <span className="text-white text-2xl font-bold">
                                        {currentUser?.displayName?.[0] || 'Y'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg">
                            <p className="text-white text-sm font-semibold">You</p>
                        </div>
                    </motion.div>

                    {/* Remote Videos */}
                    {peers.map((peer, index) => (
                        <motion.div
                            key={peer.userId}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="aspect-video bg-gray-900 rounded-2xl relative overflow-hidden"
                        >
                            <video
                                ref={(el) => {
                                    if (el) remoteVideosRef.current.set(peer.userId, el);
                                }}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            {!remoteStreams.has(peer.userId) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                                        <span className="text-white text-2xl font-bold">
                                            {peer.userName?.[0] || '?'}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg">
                                <p className="text-white text-sm font-semibold">{peer.userName}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
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
                        onClick={() => setShowChat(!showChat)}
                        className="relative p-4 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
                    >
                        <MessageCircle size={24} />
                        {messages.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                                {messages.length}
                            </span>
                        )}
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
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ x: 400 }}
                        animate={{ x: 0 }}
                        exit={{ x: 400 }}
                        className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 flex flex-col"
                    >
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <h3 className="text-white font-bold">Chat</h3>
                            <button
                                onClick={() => setShowChat(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`${
                                        msg.senderId === currentUser?.uid 
                                            ? 'ml-auto bg-blue-500' 
                                            : 'mr-auto bg-gray-800'
                                    } max-w-[80%] px-3 py-2 rounded-xl`}
                                >
                                    <p className="text-xs text-gray-300 mb-1">{msg.sender}</p>
                                    <p className="text-white text-sm">{msg.text}</p>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    type="submit"
                                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all"
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StudyRoom;
