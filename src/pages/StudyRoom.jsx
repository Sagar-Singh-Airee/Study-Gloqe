// src/pages/StudyRoom.jsx - FIXED: No API Key Required
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DailyIframe from '@daily-co/daily-js';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudyRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [roomData, setRoomData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const [callObject, setCallObject] = useState(null);
    const [isJoiningCall, setIsJoiningCall] = useState(true);
    const [participantCount, setParticipantCount] = useState(0);
    
    const videoContainerRef = useRef(null);
    const chatEndRef = useRef(null);
    const hasJoinedRef = useRef(false);
    const isLeavingRef = useRef(false);

    // ✅ FIXED: Generate Daily.co room URL without API (temporary rooms)
    const getDailyRoomUrl = () => {
        // Use Daily's temporary public rooms - no API key needed
        // Format: https://yourdomain.daily.co/roomname
        // For testing, use a random subdomain or your Daily domain
        const dailyDomain = 'studygloqe'; // Change this to your Daily subdomain
        return `https://${dailyDomain}.daily.co/${roomId}`;
    };

    // Fetch room data
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
                navigate('/dashboard?tab=rooms');
            }
        };

        if (roomId) fetchRoom();
    }, [roomId, navigate]);

    // Initialize Daily.co video call
    useEffect(() => {
        if (!roomData || !user) return;

        const initializeCall = async () => {
            try {
                setIsJoiningCall(true);

                // Get Daily room URL
                const dailyRoomUrl = getDailyRoomUrl();
                console.log('📹 Daily room URL:', dailyRoomUrl);

                // Create call object
                const call = DailyIframe.createCallObject();
                setCallObject(call);

                // Event listeners
                call.on('joined-meeting', () => {
                    console.log('✅ Joined Daily call');
                    setIsJoiningCall(false);
                    toast.success('Connected to video call');
                });

                call.on('participant-joined', (event) => {
                    console.log('👤 Participant joined:', event.participant);
                    updateParticipantCount(call);
                });

                call.on('participant-left', (event) => {
                    console.log('👋 Participant left:', event.participant);
                    updateParticipantCount(call);
                });

                call.on('error', (error) => {
                    console.error('❌ Daily error:', error);
                    toast.error('Video call error');
                    setIsJoiningCall(false);
                });

                call.on('left-meeting', () => {
                    console.log('🚪 Left meeting');
                });

                // Join the call
                await call.join({
                    url: dailyRoomUrl,
                    userName: user.displayName || 'Anonymous',
                });

                // Mount iframe
                if (videoContainerRef.current) {
                    const iframe = call.iframe();
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = '0';
                    iframe.style.borderRadius = '1rem';
                    videoContainerRef.current.appendChild(iframe);
                }

            } catch (error) {
                console.error('Error initializing call:', error);
                toast.error(`Failed to join video call: ${error.message}`);
                setIsJoiningCall(false);
            }
        };

        initializeCall();

        return () => {
            if (callObject && !isLeavingRef.current) {
                console.log('🧹 Cleaning up Daily call');
                callObject.leave().then(() => {
                    callObject.destroy();
                }).catch(err => {
                    console.error('Error during cleanup:', err);
                    callObject.destroy();
                });
            }
        };
    }, [roomData, user]);

    // Update participant count
    const updateParticipantCount = (call) => {
        const participants = call.participants();
        setParticipantCount(Object.keys(participants).length);
    };

    // Join Firestore room
    useEffect(() => {
        const joinRoom = async () => {
            if (!roomData || !user || hasJoinedRef.current) return;
            hasJoinedRef.current = true;

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
            } catch (error) {
                console.error('Error joining Firestore room:', error);
            }
        };

        joinRoom();
    }, [roomData, user, roomId]);

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

    // Leave room
    const handleLeave = async () => {
        if (isLeavingRef.current) return;
        isLeavingRef.current = true;

        try {
            // Leave Daily call
            if (callObject) {
                await callObject.leave();
                callObject.destroy();
            }

            // Update Firestore
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

            toast.success('Left study room');
            navigate('/dashboard?tab=rooms', { replace: true });
        } catch (error) {
            console.error('Error leaving room:', error);
            navigate('/dashboard?tab=rooms', { replace: true });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={56} className="animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-white font-bold text-lg">Loading study room...</p>
                </div>
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
                    className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6 shadow-2xl"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-white mb-2">{roomData?.name}</h1>
                            <div className="flex items-center gap-4 text-gray-400">
                                <span className="flex items-center gap-2">
                                    <BookOpen size={16} />
                                    {roomData?.topic || 'General Study'}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Clock size={16} />
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    Live
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10">
                                <Users size={18} className="text-white" />
                                <span className="text-white font-bold">{participantCount}</span>
                            </div>
                            <button
                                onClick={handleLeave}
                                className="px-6 py-3 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border border-red-500/50 text-white rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg hover:shadow-red-500/50"
                            >
                                <PhoneOff size={18} />
                                Leave Room
                            </button>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Area */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            {isJoiningCall && (
                                <div className="absolute inset-0 bg-gray-900 rounded-2xl flex items-center justify-center z-10">
                                    <div className="text-center">
                                        <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                                        <p className="text-white font-semibold">Connecting to video call...</p>
                                        <p className="text-gray-400 text-sm mt-2">Please allow camera/microphone access</p>
                                    </div>
                                </div>
                            )}
                            <div 
                                ref={videoContainerRef} 
                                className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10"
                                style={{ minHeight: '600px' }}
                            />
                        </div>
                    </div>

                    {/* Chat Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gradient-to-b from-gray-900/50 to-black/50 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col h-[calc(100vh-200px)] shadow-2xl"
                    >
                        <div className="p-4 border-b border-white/10">
                            <h3 className="text-white font-black text-lg flex items-center gap-2">
                                <MessageCircle size={20} />
                                Chat
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg, idx) => (
                                <div key={msg.id || idx}>
                                    {msg.type === 'system' ? (
                                        <p className="text-center text-gray-500 text-xs italic py-2">{msg.text}</p>
                                    ) : (
                                        <div className={`${msg.senderId === user?.uid ? 'ml-auto' : 'mr-auto'} max-w-[85%]`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                {msg.senderPhoto ? (
                                                    <img src={msg.senderPhoto} alt="" className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-[10px] font-bold">
                                                            {msg.senderName?.[0]?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-gray-400 font-semibold">{msg.senderName}</p>
                                            </div>
                                            <div className={`px-3 py-2 rounded-xl ${
                                                msg.senderId === user?.uid 
                                                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
                                                    : 'bg-gray-800 text-white'
                                            }`}>
                                                <p className="text-xs font-medium">{msg.text}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-3 bg-gray-800/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10 text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={!messageText.trim()}
                                    className="px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
