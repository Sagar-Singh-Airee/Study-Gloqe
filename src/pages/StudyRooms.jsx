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
  VideoOff,
  PhoneOff,
  Share2
} from 'lucide-react';

const StudyRooms = () => {
  const [rooms, setRooms] = useState([
    {
      id: 1,
      name: 'Physics Study Group',
      host: 'Alice Johnson',
      participants: 5,
      maxParticipants: 10,
      topic: 'Quantum Mechanics',
      isPublic: true,
      active: true
    },
    {
      id: 2,
      name: 'Math Homework Session',
      host: 'Bob Smith',
      participants: 3,
      maxParticipants: 6,
      topic: 'Calculus',
      isPublic: false,
      active: true
    },
    {
      id: 3,
      name: 'Chemistry Lab Review',
      host: 'Charlie Brown',
      participants: 8,
      maxParticipants: 12,
      topic: 'Organic Chemistry',
      isPublic: true,
      active: true
    }
  ]);

  const [inRoom, setInRoom] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const joinRoom = (room) => {
    setCurrentRoom(room);
    setInRoom(true);
  };

  const leaveRoom = () => {
    setInRoom(false);
    setCurrentRoom(null);
  };

  if (inRoom && currentRoom) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Room Header */}
        <div className="card mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold">{currentRoom.name}</h2>
              <p className="text-sm text-primary-400">
                Host: {currentRoom.host} • {currentRoom.participants} participants
              </p>
            </div>
            <button
              onClick={leaveRoom}
              className="btn-secondary text-error flex items-center gap-2"
            >
              <PhoneOff size={18} />
              Leave Room
            </button>
          </div>
        </div>

        <div className="flex-1 grid lg:grid-cols-4 gap-4">
          {/* Video Grid */}
          <div className="lg:col-span-3">
            <div className="card h-full">
              {/* Main Video Display */}
              <div className="grid grid-cols-2 gap-4 h-full">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="relative rounded-xl bg-primary-900 overflow-hidden aspect-video flex items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center text-2xl font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                    <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-sm">
                      Participant {i}
                    </div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isMuted
                      ? 'bg-error hover:bg-error/80'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isVideoOff
                      ? 'bg-error hover:bg-error/80'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>

                <button className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  <Share2 size={20} />
                </button>

                <button
                  onClick={leaveRoom}
                  className="w-12 h-12 rounded-full bg-error hover:bg-error/80 flex items-center justify-center transition-all"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <div className="card h-full flex flex-col">
              <h3 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                <MessageCircle size={20} />
                Chat
              </h3>

              <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar mb-4">
                {[
                  { user: 'Alice', message: 'Welcome everyone!', time: '10:30 AM' },
                  { user: 'Bob', message: 'Thanks for hosting!', time: '10:31 AM' },
                  { user: 'Charlie', message: 'Can we start with Chapter 5?', time: '10:32 AM' }
                ].map((msg, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{msg.user}</span>
                      <span className="text-xs text-primary-400">{msg.time}</span>
                    </div>
                    <p className="text-sm text-primary-200">{msg.message}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="input flex-1"
                />
                <button className="btn-primary">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          Study <span className="gradient-text">Rooms</span>
        </h1>
        <p className="text-primary-300">
          Join or create virtual study sessions with peers
        </p>
      </motion.div>

      {/* Create Room Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card bg-gradient-to-r from-accent/20 to-blue-600/20 border-accent/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-accent to-blue-600 flex items-center justify-center">
              <Plus size={32} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Create Your Own Room</h3>
              <p className="text-sm text-primary-400">
                Start a study session and invite your friends
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Create Room
          </button>
        </div>
      </motion.div>

      {/* Active Rooms */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-2xl font-display font-semibold mb-6">Active Rooms</h2>

        {rooms.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={64} className="mx-auto text-primary-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No active rooms</h3>
            <p className="text-primary-400 mb-6">
              Be the first to create a study room
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create Room
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {rooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="card-hover"
              >
                {/* Room Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{room.name}</h3>
                    <p className="text-sm text-primary-400">
                      Host: {room.host}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs ${
                    room.isPublic
                      ? 'bg-success/20 text-success'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {room.isPublic ? (
                      <div className="flex items-center gap-1">
                        <Globe size={12} />
                        Public
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Lock size={12} />
                        Private
                      </div>
                    )}
                  </div>
                </div>

                {/* Topic */}
                <div className="mb-4">
                  <div className="text-sm text-primary-400 mb-1">Topic</div>
                  <div className="badge badge-primary">{room.topic}</div>
                </div>

                {/* Participants */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-primary-400" />
                    <span>
                      {room.participants}/{room.maxParticipants} participants
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-primary-400" />
                    <span>Active now</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-primary-800 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-blue-600"
                    style={{ width: `${(room.participants / room.maxParticipants) * 100}%` }}
                  ></div>
                </div>

                {/* Join Button */}
                <button
                  onClick={() => joinRoom(room)}
                  disabled={room.participants >= room.maxParticipants}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Video size={18} />
                  {room.participants >= room.maxParticipants ? 'Room Full' : 'Join Room'}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudyRooms;