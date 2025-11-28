// src/components/features/RoomsSection.jsx - FIXED
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    collection, 
    query, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    orderBy,
    where,
    updateDoc,
    doc,
    arrayUnion,
    increment,
    getDocs
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
    Video,
    Users,
    Plus,
    Clock,
    Lock,
    Globe,
    Loader2
} from 'lucide-react';

const RoomsSection = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoom, setNewRoom] = useState({
        name: '',
        topic: '',
        maxMembers: 10,
        isPrivate: false
    });

    // Real-time listener for active rooms (FIXED - removed orderBy to avoid index requirement)
    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        console.log('🔍 Setting up rooms listener...');

        const roomsRef = collection(db, 'rooms');
        
        // OPTION 1: Simple query without orderBy (no index needed)
        const q = query(
            roomsRef,
            where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(
            q, 
            (snapshot) => {
                console.log('📦 Received', snapshot.docs.length, 'rooms');
                
                const roomsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startedAt: doc.data().createdAt?.toDate()
                }));
                
                // Sort client-side (no index needed)
                roomsData.sort((a, b) => {
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return b.createdAt.seconds - a.createdAt.seconds;
                });
                
                setRooms(roomsData);
                setLoading(false);
            }, 
            (error) => {
                console.error('❌ Error fetching rooms:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                // If it's an index error, fall back to getting all rooms
                if (error.code === 'failed-precondition') {
                    console.log('⚠️ Index missing, fetching all rooms...');
                    fetchAllRooms();
                } else {
                    setLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    // Fallback: fetch all rooms without real-time updates
    const fetchAllRooms = async () => {
        try {
            const roomsRef = collection(db, 'rooms');
            const snapshot = await getDocs(roomsRef);
            
            const roomsData = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startedAt: doc.data().createdAt?.toDate()
                }))
                .filter(room => room.isActive === true)
                .sort((a, b) => {
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return b.createdAt.seconds - a.createdAt.seconds;
                });
            
            setRooms(roomsData);
            setLoading(false);
            console.log('✅ Fetched rooms (fallback):', roomsData.length);
        } catch (error) {
            console.error('❌ Fallback fetch failed:', error);
            setLoading(false);
        }
    };

    // Create new room
    const createRoom = async (e) => {
        e.preventDefault();
        if (!newRoom.name.trim() || !newRoom.topic.trim()) return;

        try {
            const roomData = {
                name: newRoom.name.trim(),
                topic: newRoom.topic.trim(),
                maxMembers: parseInt(newRoom.maxMembers),
                isPrivate: newRoom.isPrivate,
                hostId: currentUser.uid,
                hostName: currentUser.displayName || 'Anonymous',
                members: [currentUser.uid],
                memberCount: 1,
                isActive: true,
                participants: [], // For WebRTC tracking
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'rooms'), roomData);
            console.log('✅ Room created:', docRef.id);
            
            // Navigate to room
            navigate(`/study-room/${docRef.id}`);
            
            // Reset form
            setNewRoom({ name: '', topic: '', maxMembers: 10, isPrivate: false });
            setShowCreateModal(false);
        } catch (error) {
            console.error('❌ Error creating room:', error);
            alert('Failed to create room. Please try again.');
        }
    };

    // Join existing room
    const joinRoom = async (room) => {
        if (room.memberCount >= room.maxMembers) {
            alert('Room is full!');
            return;
        }

        try {
            const roomRef = doc(db, 'rooms', room.id);
            await updateDoc(roomRef, {
                members: arrayUnion(currentUser.uid),
                memberCount: increment(1),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Joined room:', room.id);
            navigate(`/study-room/${room.id}`);
        } catch (error) {
            console.error('❌ Error joining room:', error);
            alert('Failed to join room. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={48} className="animate-spin text-gray-400" />
                <p className="text-gray-500 mt-4">Loading rooms...</p>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-black text-black mb-2">Study Rooms</h1>
                    <p className="text-gray-600">Collaborate with peers in real-time</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                >
                    <Plus size={20} />
                    Create Room
                </button>
            </div>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 max-w-md w-full"
                    >
                        <h2 className="text-2xl font-black text-black mb-6">Create Study Room</h2>
                        <form onSubmit={createRoom} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Room Name
                                </label>
                                <input
                                    type="text"
                                    value={newRoom.name}
                                    onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none"
                                    placeholder="e.g., Physics Study Group"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Topic
                                </label>
                                <input
                                    type="text"
                                    value={newRoom.topic}
                                    onChange={(e) => setNewRoom({...newRoom, topic: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none"
                                    placeholder="e.g., Thermodynamics"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Max Members
                                </label>
                                <select
                                    value={newRoom.maxMembers}
                                    onChange={(e) => setNewRoom({...newRoom, maxMembers: e.target.value})}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none"
                                >
                                    <option value="6">6 members</option>
                                    <option value="10">10 members</option>
                                    <option value="15">15 members</option>
                                    <option value="20">20 members</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="private"
                                    checked={newRoom.isPrivate}
                                    onChange={(e) => setNewRoom({...newRoom, isPrivate: e.target.checked})}
                                    className="w-5 h-5"
                                />
                                <label htmlFor="private" className="text-sm font-semibold text-gray-700">
                                    Private Room (invite only)
                                </label>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 border-2 border-gray-200 text-black rounded-xl font-bold hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                                >
                                    Create Room
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Rooms Grid */}
            {rooms.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room, idx) => (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-black hover:shadow-lg transition-all group"
                        >
                            {/* Icon */}
                            <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mb-4">
                                <Video size={32} className="text-white" />
                            </div>

                            {/* Room Info */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-black mb-1">{room.name}</h3>
                                    <p className="text-sm text-gray-500">{room.topic}</p>
                                </div>
                                {room.isPrivate ? (
                                    <Lock size={18} className="text-gray-400" />
                                ) : (
                                    <Globe size={18} className="text-gray-400" />
                                )}
                            </div>

                            {/* Stats */}
                            <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Host</span>
                                    <span className="font-semibold text-black">{room.hostName}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Members</span>
                                    <span className="font-semibold text-black">
                                        {room.memberCount}/{room.maxMembers}
                                    </span>
                                </div>
                                {room.startedAt && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <Clock size={14} />
                                        {room.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            {/* Join Button */}
                            <button
                                onClick={() => joinRoom(room)}
                                disabled={room.memberCount >= room.maxMembers}
                                className={`w-full py-3 rounded-xl font-bold transition-all ${
                                    room.memberCount >= room.maxMembers
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-black text-white hover:scale-105'
                                }`}
                            >
                                {room.memberCount >= room.maxMembers ? 'Room Full' : 'Join Room'}
                            </button>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <Video size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-bold text-black mb-2">No Active Rooms</h3>
                    <p className="text-gray-600 mb-6">Create a room to start studying with others</p>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        <Plus size={20} />
                        Create Your First Room
                    </button>
                </div>
            )}
        </>
    );
};

export default RoomsSection;
