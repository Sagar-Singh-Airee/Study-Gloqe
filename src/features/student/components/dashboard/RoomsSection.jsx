// src/components/features/RoomsSection.jsx - FIXED WITHOUT MISSION TRACKING
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    collection, 
    query, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    where,
    updateDoc,
    deleteDoc,
    doc,
    arrayUnion,
    increment,
    getDocs
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { awardXP, XP_REWARDS } from '@gamification/services/gamificationService';
import {
    Video,
    Users,
    Plus,
    Clock,
    Lock,
    Globe,
    Loader2,
    Zap,
    Sparkles,
    Award,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const RoomsSection = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [newRoom, setNewRoom] = useState({
        name: '',
        topic: '',
        maxMembers: 10,
        isPrivate: false
    });

    // Real-time listener for active rooms
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        console.log('🔍 Setting up rooms listener...');

        const roomsRef = collection(db, 'rooms');
        const q = query(roomsRef, where('isActive', '==', true));

        const unsubscribe = onSnapshot(
            q, 
            (snapshot) => {
                console.log('📦 Received', snapshot.docs.length, 'rooms');
                
                const roomsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startedAt: doc.data().createdAt?.toDate()
                }));
                
                // Sort by creation time (newest first)
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
                
                if (error.code === 'failed-precondition') {
                    console.log('⚠️ Index missing, fetching all rooms...');
                    fetchAllRooms();
                } else {
                    setLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Fallback: fetch all rooms
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

    // Create room with gamification
    const createRoom = useCallback(async (e) => {
        e.preventDefault();
        if (!newRoom.name.trim() || !newRoom.topic.trim() || !user?.uid) return;

        try {
            const roomData = {
                name: newRoom.name.trim(),
                topic: newRoom.topic.trim(),
                maxMembers: parseInt(newRoom.maxMembers),
                isPrivate: newRoom.isPrivate,
                hostId: user.uid,
                hostName: user.displayName || user.email || 'Anonymous',
                members: [user.uid],
                memberCount: 1,
                isActive: true,
                participants: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'rooms'), roomData);
            console.log('✅ Room created:', docRef.id);

            // Award XP
            await awardXP(user.uid, 15, 'Created Study Room');
            
            toast.success('🎉 Room created! +15 XP', {
                duration: 2500,
                style: {
                    background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                    padding: '16px 24px',
                },
            });
            
            navigate(`/study-room/${docRef.id}`);
            
            setNewRoom({ name: '', topic: '', maxMembers: 10, isPrivate: false });
            setShowCreateModal(false);
        } catch (error) {
            console.error('❌ Error creating room:', error);
            toast.error('Failed to create room. Please try again.');
        }
    }, [newRoom, user, navigate]);

    // Delete room
    const deleteRoom = useCallback(async (roomId) => {
        if (!user?.uid) return;

        try {
            await deleteDoc(doc(db, 'rooms', roomId));
            
            toast.success('🗑️ Room deleted successfully', {
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                },
            });
            
            setDeleteConfirm(null);
            console.log('✅ Room deleted:', roomId);
        } catch (error) {
            console.error('❌ Error deleting room:', error);
            toast.error('Failed to delete room.');
        }
    }, [user]);

    // Join room with gamification
    const joinRoom = useCallback(async (room) => {
        if (!user?.uid) return;
        
        if (room.memberCount >= room.maxMembers) {
            toast.error('Room is full!', {
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                },
            });
            return;
        }

        try {
            const roomRef = doc(db, 'rooms', room.id);
            await updateDoc(roomRef, {
                members: arrayUnion(user.uid),
                memberCount: increment(1),
                updatedAt: serverTimestamp()
            });

            // Award XP for joining room
            await awardXP(user.uid, XP_REWARDS.JOIN_ROOM, 'Joined Study Room');

            toast.success(`🎯 +${XP_REWARDS.JOIN_ROOM} XP for joining!`, {
                duration: 2500,
                style: {
                    background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                    padding: '16px 24px',
                },
            });

            console.log('✅ Joined room:', room.id);
            navigate(`/study-room/${room.id}`);
        } catch (error) {
            console.error('❌ Error joining room:', error);
            toast.error('Failed to join room. Please try again.');
        }
    }, [user, navigate]);

    const activeRoomsCount = useMemo(() => rooms.length, [rooms.length]);
    const totalXPAvailable = useMemo(() => activeRoomsCount * XP_REWARDS.JOIN_ROOM, [activeRoomsCount]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={48} className="animate-spin text-black mb-4" />
                <p className="text-gray-500 font-semibold">Loading study rooms...</p>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-4xl font-black text-black">Study Rooms</h1>
                        <Sparkles size={32} className="text-black" />
                    </div>
                    <p className="text-gray-600">Collaborate with peers in real-time</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                >
                    <Plus size={20} />
                    Create Room
                </button>
            </div>

            {/* XP Earning Banner */}
            {activeRoomsCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 bg-gradient-to-r from-black via-gray-900 to-black rounded-2xl border border-white/10"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Zap size={20} className="text-white" fill="white" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">
                                    Join rooms to earn XP and connect with peers!
                                </p>
                                <p className="text-gray-400 text-xs">
                                    +{XP_REWARDS.JOIN_ROOM} XP per room • +15 XP for creating rooms
                                </p>
                            </div>
                        </div>
                        <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                            <p className="text-white font-black text-lg flex items-center gap-1">
                                <Award size={20} className="text-yellow-400" />
                                {totalXPAvailable} XP
                            </p>
                            <p className="text-gray-400 text-xs">Available</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Stats Banner */}
            {activeRoomsCount > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white border-2 border-black rounded-2xl p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                                <Video size={24} className="text-white" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-black">
                                    {activeRoomsCount}
                                </div>
                                <div className="text-sm text-gray-500">Active Rooms</div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                                <Users size={24} className="text-white" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-black">
                                    {rooms.reduce((sum, r) => sum + (r.memberCount || 0), 0)}
                                </div>
                                <div className="text-sm text-gray-500">Total Members</div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-2xl p-5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                                <Zap size={24} className="text-white" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-black flex items-center gap-1">
                                    +{XP_REWARDS.JOIN_ROOM}
                                    <span className="text-sm font-normal text-gray-600">XP</span>
                                </div>
                                <div className="text-sm text-gray-600">Per Room Joined</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Create Room Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-black">Create Study Room</h2>
                                <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-1 text-xs font-bold">
                                    <Zap size={12} />
                                    +15 XP
                                </div>
                            </div>
                            
                            <form onSubmit={createRoom} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-2">
                                        Room Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newRoom.name}
                                        onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 text-black border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none focus:bg-white transition-all font-medium placeholder:text-gray-400"
                                        placeholder="e.g., Physics Study Group"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-2">
                                        Topic
                                    </label>
                                    <input
                                        type="text"
                                        value={newRoom.topic}
                                        onChange={(e) => setNewRoom({...newRoom, topic: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 text-black border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none focus:bg-white transition-all font-medium placeholder:text-gray-400"
                                        placeholder="e.g., Thermodynamics"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-black mb-2">
                                        Max Members
                                    </label>
                                    <select
                                        value={newRoom.maxMembers}
                                        onChange={(e) => setNewRoom({...newRoom, maxMembers: e.target.value})}
                                        className="w-full px-4 py-3 bg-gray-50 text-black border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none focus:bg-white transition-all font-medium"
                                    >
                                        <option value="6">6 members</option>
                                        <option value="10">10 members</option>
                                        <option value="15">15 members</option>
                                        <option value="20">20 members</option>
                                    </select>
                                </div>
                                
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="private"
                                        checked={newRoom.isPrivate}
                                        onChange={(e) => setNewRoom({...newRoom, isPrivate: e.target.checked})}
                                        className="w-5 h-5 accent-black"
                                    />
                                    <label htmlFor="private" className="text-sm font-semibold text-black flex items-center gap-2">
                                        <Lock size={16} className="text-gray-500" />
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
                                        className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={18} />
                                        Create Room
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-black text-black text-center mb-2">
                                Delete Room?
                            </h3>
                            <p className="text-gray-600 text-center mb-6 text-sm">
                                This action cannot be undone. All participants will be removed.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-3 border-2 border-gray-200 text-black rounded-xl font-bold hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => deleteRoom(deleteConfirm)}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rooms Grid */}
            {rooms.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room, idx) => (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-black hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            
                            {/* Content */}
                            <div className="relative z-10">
                                {/* Icon & Delete Button */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Video size={32} className="text-white" />
                                    </div>
                                    {room.hostId === user?.uid && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirm(room.id);
                                            }}
                                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-all"
                                            title="Delete room"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Room Info */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-black mb-1">{room.name}</h3>
                                        <p className="text-sm text-gray-500">{room.topic}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {room.isPrivate ? (
                                            <Lock size={18} className="text-gray-400" />
                                        ) : (
                                            <Globe size={18} className="text-gray-400" />
                                        )}
                                        <div className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded-lg flex items-center gap-1 text-xs font-bold">
                                            <Zap size={10} />
                                            +{XP_REWARDS.JOIN_ROOM}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Host</span>
                                        <span className="font-semibold text-black">{room.hostName}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Members</span>
                                        <span className="font-semibold text-black flex items-center gap-1">
                                            <Users size={14} />
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
                                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                        room.memberCount >= room.maxMembers
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-black text-white hover:scale-105 shadow-lg'
                                    }`}
                                >
                                    {room.memberCount >= room.maxMembers ? (
                                        <>
                                            <Lock size={18} />
                                            Room Full
                                        </>
                                    ) : (
                                        <>
                                            <Video size={18} />
                                            Join Room
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20"
                >
                    <div className="w-24 h-24 bg-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <Video size={48} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-2">No Active Rooms</h3>
                    <p className="text-gray-600 mb-2">Create a room to start studying with others</p>
                    <p className="text-sm text-green-600 font-bold mb-6 flex items-center justify-center gap-1">
                        <Zap size={16} />
                        Earn +15 XP for creating the first room!
                    </p>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-2xl"
                    >
                        <Plus size={20} />
                        Create Your First Room
                        <Sparkles size={20} />
                    </button>
                </motion.div>
            )}
        </>
    );
};

export default RoomsSection;
