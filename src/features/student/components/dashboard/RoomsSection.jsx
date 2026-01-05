// src/components/features/RoomsSection.jsx - PREMIUM LIGHT COMPACT EDITION 💎

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    collection, query, onSnapshot, addDoc, serverTimestamp,
    where, updateDoc, deleteDoc, doc, arrayUnion, increment, getDocs
} from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { awardXP, XP_REWARDS } from '@gamification/services/gamificationService';
import {
    Video, Users, Plus, Clock, Lock, Globe, Loader2,
    Zap, Sparkles, Trash2, AlertTriangle
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

    // Real-time listener for user's rooms
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const roomsRef = collection(db, 'rooms');
        const q = query(
            roomsRef,
            where('isActive', '==', true),
            where('hostId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const roomsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startedAt: doc.data().createdAt?.toDate()
                }));

                roomsData.sort((a, b) => {
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return b.createdAt.seconds - a.createdAt.seconds;
                });

                setRooms(roomsData);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching rooms:', error);
                if (error.code === 'failed-precondition') {
                    fetchUserRooms();
                } else {
                    setLoading(false);
                }
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Fallback fetch
    const fetchUserRooms = async () => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        try {
            const roomsRef = collection(db, 'rooms');
            const q = query(
                roomsRef,
                where('hostId', '==', user.uid),
                where('isActive', '==', true)
            );

            const snapshot = await getDocs(q);
            const roomsData = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startedAt: doc.data().createdAt?.toDate()
                }))
                .sort((a, b) => {
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return b.createdAt.seconds - a.createdAt.seconds;
                });

            setRooms(roomsData);
            setLoading(false);
        } catch (error) {
            console.error('Fallback fetch failed:', error);
            setLoading(false);
        }
    };

    // Create room
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
            await awardXP(user.uid, XP_REWARDS.CREATE_ROOM, 'Created Study Room');

            toast.success(`Room created! +${XP_REWARDS.CREATE_ROOM} XP`);
            navigate(`/study-room/${docRef.id}`);

            setNewRoom({ name: '', topic: '', maxMembers: 10, isPrivate: false });
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating room:', error);
            toast.error('Failed to create room');
        }
    }, [newRoom, user, navigate]);

    // Delete room
    const deleteRoom = useCallback(async (roomId) => {
        if (!user?.uid) return;

        try {
            await deleteDoc(doc(db, 'rooms', roomId));
            toast.success('Room deleted');
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting room:', error);
            toast.error('Failed to delete room');
        }
    }, [user]);

    // Join room
    const joinRoom = useCallback(async (room) => {
        if (!user?.uid) return;

        if (room.memberCount >= room.maxMembers) {
            toast.error('Room is full!');
            return;
        }

        try {
            const roomRef = doc(db, 'rooms', room.id);
            await updateDoc(roomRef, {
                members: arrayUnion(user.uid),
                memberCount: increment(1),
                updatedAt: serverTimestamp()
            });

            await awardXP(user.uid, XP_REWARDS.JOIN_ROOM, 'Joined Study Room');
            toast.success(`+${XP_REWARDS.JOIN_ROOM} XP for joining!`);
            navigate(`/study-room/${room.id}`);
        } catch (error) {
            console.error('Error joining room:', error);
            toast.error('Failed to join room');
        }
    }, [user, navigate]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-2 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium text-slate-600">Loading study rooms...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-white via-teal-50/20 to-blue-50/20" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-0.5">My Study Rooms</h1>
                        <p className="text-xs text-slate-600">
                            {rooms.length} active room{rooms.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                    >
                        <Plus size={14} />
                        Create Room
                    </button>
                </div>

                {/* Create Room Modal */}
                <AnimatePresence>
                    {showCreateModal && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200"
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-lg font-bold text-slate-900">Create Study Room</h2>
                                    <div className="px-2 py-1 bg-teal-50 text-teal-700 rounded-lg flex items-center gap-1 text-[10px] font-bold border border-teal-200">
                                        <Zap size={10} />
                                        +{XP_REWARDS.CREATE_ROOM} XP
                                    </div>
                                </div>

                                <form onSubmit={createRoom} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Room Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newRoom.name}
                                            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all text-sm placeholder:text-slate-400"
                                            placeholder="e.g., Physics Study Group"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Topic
                                        </label>
                                        <input
                                            type="text"
                                            value={newRoom.topic}
                                            onChange={(e) => setNewRoom({ ...newRoom, topic: e.target.value })}
                                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all text-sm placeholder:text-slate-400"
                                            placeholder="e.g., Thermodynamics"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            Max Members
                                        </label>
                                        <select
                                            value={newRoom.maxMembers}
                                            onChange={(e) => setNewRoom({ ...newRoom, maxMembers: e.target.value })}
                                            className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all text-sm"
                                        >
                                            <option value="6">6 members</option>
                                            <option value="10">10 members</option>
                                            <option value="15">15 members</option>
                                            <option value="20">20 members</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <input
                                            type="checkbox"
                                            id="private"
                                            checked={newRoom.isPrivate}
                                            onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                                            className="w-4 h-4 accent-teal-600"
                                        />
                                        <label htmlFor="private" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            <Lock size={12} className="text-slate-500" />
                                            Private Room (invite only)
                                        </label>
                                    </div>

                                    <div className="flex gap-2 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <Sparkles size={14} />
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
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200"
                            >
                                <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-200">
                                    <AlertTriangle size={24} className="text-rose-600" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 text-center mb-1">
                                    Delete Room?
                                </h3>
                                <p className="text-xs text-slate-600 text-center mb-5 leading-relaxed">
                                    This action cannot be undone. All participants will be removed.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => deleteRoom(deleteConfirm)}
                                        className="flex-1 py-2.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {rooms.map((room, idx) => (
                            <motion.div
                                key={room.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                whileHover={{ y: -2 }}
                                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-300 hover:shadow-md transition-all group"
                            >
                                {/* Icon & Delete Button */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                        <Video size={18} className="text-white" strokeWidth={2.5} />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteConfirm(room.id);
                                        }}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all border border-rose-200"
                                        title="Delete room"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Room Info */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 mb-0.5 truncate">{room.name}</h3>
                                        <p className="text-xs text-slate-600 truncate">{room.topic}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2">
                                        {room.isPrivate ? (
                                            <Lock size={12} className="text-slate-400" />
                                        ) : (
                                            <Globe size={12} className="text-slate-400" />
                                        )}
                                        <div className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded text-[10px] font-bold border border-teal-200">
                                            Host
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="space-y-1.5 mb-3 pb-3 border-b border-slate-100">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Host</span>
                                        <span className="font-bold text-slate-900 truncate ml-2">{room.hostName}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Members</span>
                                        <span className="font-bold text-slate-900 flex items-center gap-1">
                                            <Users size={11} />
                                            {room.memberCount}/{room.maxMembers}
                                        </span>
                                    </div>
                                    {room.startedAt && (
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                            <Clock size={10} />
                                            {room.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>

                                {/* Join Button */}
                                <button
                                    onClick={() => navigate(`/study-room/${room.id}`)}
                                    className="w-full py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:shadow-sm"
                                >
                                    <Video size={14} />
                                    Enter Room
                                </button>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16"
                    >
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Video size={32} className="text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Rooms</h3>
                        <p className="text-xs text-slate-600 mb-1">Create your first room to start studying with others</p>
                        <p className="text-[11px] text-teal-600 font-bold mb-5 flex items-center justify-center gap-1">
                            <Zap size={12} />
                            Earn +{XP_REWARDS.CREATE_ROOM} XP for creating your first room!
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-blue-600 text-white rounded-lg text-xs font-bold hover:shadow-sm transition-all"
                        >
                            <Plus size={14} />
                            Create Your First Room
                            <Sparkles size={14} />
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default RoomsSection;
