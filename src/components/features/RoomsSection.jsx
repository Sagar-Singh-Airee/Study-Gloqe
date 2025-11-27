// src/components/features/RoomsSection.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Video,
    Users,
    Plus,
    Clock,
    Lock,
    Globe,
    MessageCircle,
    Mic,
    MicOff,
    VideoOff as VideoOffIcon,
    PhoneOff,
    Share2
} from 'lucide-react';

const RoomsSection = () => {
    const [rooms, setRooms] = useState([
        {
            id: 1,
            name: 'Physics Study Group',
            topic: 'Thermodynamics',
            members: 5,
            maxMembers: 10,
            isPrivate: false,
            host: 'Sarah Johnson',
            startedAt: new Date()
        },
        {
            id: 2,
            name: 'Math Homework Help',
            topic: 'Calculus',
            members: 3,
            maxMembers: 6,
            isPrivate: true,
            host: 'Mike Chen',
            startedAt: new Date()
        },
        {
            id: 3,
            name: 'General Study Room',
            topic: 'Mixed Subjects',
            members: 8,
            maxMembers: 15,
            isPrivate: false,
            host: 'Emma Williams',
            startedAt: new Date()
        }
    ]);

    const [inRoom, setInRoom] = useState(false);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const joinRoom = (room) => {
        setCurrentRoom(room);
        setInRoom(true);
    };

    const leaveRoom = () => {
        setInRoom(false);
        setCurrentRoom(null);
        setIsMuted(false);
        setIsVideoOff(false);
    };

    if (inRoom && currentRoom) {
        return (
            <div className="max-w-6xl mx-auto">
                {/* Video Grid */}
                <div className="bg-black rounded-3xl p-6 mb-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden">
                                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                                    <Users size={32} className="text-white" />
                                </div>
                                <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 rounded-lg text-white text-sm font-semibold backdrop-blur-sm">
                                    Student {i}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-4 rounded-xl transition-all ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
                                } text-white`}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <button
                            onClick={() => setIsVideoOff(!isVideoOff)}
                            className={`p-4 rounded-xl transition-all ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
                                } text-white`}
                        >
                            {isVideoOff ? <VideoOffIcon size={24} /> : <Video size={24} />}
                        </button>
                        <button className="p-4 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all">
                            <Share2 size={24} />
                        </button>
                        <button
                            onClick={leaveRoom}
                            className="p-4 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-black mb-2">{currentRoom.name}</h3>
                    <p className="text-gray-600 mb-4">Topic: {currentRoom.topic}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                            <Users size={16} />
                            {currentRoom.members} members
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={16} />
                            Started {new Date(currentRoom.startedAt).toLocaleTimeString()}
                        </span>
                    </div>
                </div>
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
                <button className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all">
                    <Plus size={20} />
                    Create Room
                </button>
            </div>

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
                                    <span className="font-semibold text-black">{room.host}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Members</span>
                                    <span className="font-semibold text-black">{room.members}/{room.maxMembers}</span>
                                </div>
                            </div>

                            {/* Join Button */}
                            <button
                                onClick={() => joinRoom(room)}
                                className="w-full py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all"
                            >
                                Join Room
                            </button>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20">
                    <Video size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-bold text-black mb-2">No Active Rooms</h3>
                    <p className="text-gray-600 mb-6">Create a room to start studying with others</p>
                    <button className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all">
                        <Plus size={20} />
                        Create Your First Room
                    </button>
                </div>
            )}
        </>
    );
};

export default RoomsSection;
