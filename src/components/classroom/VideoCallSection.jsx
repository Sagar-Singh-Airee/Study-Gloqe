// src/components/classroom/VideoCallSection.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Video, VideoOff, Mic, MicOff, Monitor, Users, 
    Phone, Settings, MessageSquare, Hand, Camera 
} from 'lucide-react';
import toast from 'react-hot-toast';

const VideoCallSection = ({ classId, isTeacher }) => {
    const [isInCall, setIsInCall] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const startSession = () => {
        setIsInCall(true);
        toast.success('Joined live session!');
    };

    const endSession = () => {
        setIsInCall(false);
        toast.success('Left live session');
    };

    if (!isInCall) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Preview */}
                <div className="relative bg-gradient-to-br from-gray-900 to-black aspect-video flex items-center justify-center">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative text-center text-white">
                        <Video size={64} className="mx-auto mb-4" />
                        <h3 className="text-2xl font-black mb-2">No Active Session</h3>
                        <p className="text-gray-400">
                            {isTeacher 
                                ? 'Start a live session to teach your students' 
                                : 'Wait for your teacher to start the session'}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                    {/* Pre-call Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setIsCameraOn(!isCameraOn)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                isCameraOn 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-red-500 bg-red-50'
                            }`}
                        >
                            {isCameraOn ? (
                                <Video size={20} className="text-green-600" />
                            ) : (
                                <VideoOff size={20} className="text-red-600" />
                            )}
                            <span className="font-bold text-black">
                                Camera {isCameraOn ? 'On' : 'Off'}
                            </span>
                        </button>

                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                isMicOn 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-red-500 bg-red-50'
                            }`}
                        >
                            {isMicOn ? (
                                <Mic size={20} className="text-green-600" />
                            ) : (
                                <MicOff size={20} className="text-red-600" />
                            )}
                            <span className="font-bold text-black">
                                Mic {isMicOn ? 'On' : 'Off'}
                            </span>
                        </button>
                    </div>

                    {/* Join Button */}
                    {isTeacher ? (
                        <button
                            onClick={startSession}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            <Video size={24} />
                            Start Live Session
                        </button>
                    ) : (
                        <button
                            onClick={startSession}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
                        >
                            <Video size={24} />
                            Join Session
                        </button>
                    )}

                    <p className="text-center text-sm text-gray-500">
                        {isTeacher 
                            ? 'Students will be notified when you start' 
                            : 'You will be notified when session starts'}
                    </p>
                </div>
            </div>
        );
    }

    // Active Call UI
    return (
        <div className="space-y-4">
            {/* Main Video Grid */}
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden">
                {/* Video Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
                    {/* Teacher/Main Video */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-2 md:col-span-3 aspect-video bg-gray-800 rounded-xl relative overflow-hidden"
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Camera size={64} className="text-gray-600" />
                        </div>
                        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/80 backdrop-blur-xl rounded-lg">
                            <span className="text-white font-bold text-sm">
                                {isTeacher ? 'You (Teacher)' : 'Teacher Name'}
                            </span>
                        </div>
                        {!isCameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <VideoOff size={48} className="text-white" />
                            </div>
                        )}
                    </motion.div>

                    {/* Student Videos */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="aspect-video bg-gray-800 rounded-xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Users size={32} className="text-gray-600" />
                            </div>
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-xl rounded text-xs">
                                <span className="text-white font-bold">Student {i}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Control Bar */}
                <div className="bg-black/50 backdrop-blur-xl border-t border-white/10 p-6">
                    <div className="flex items-center justify-center gap-3">
                        {/* Camera Toggle */}
                        <button
                            onClick={() => setIsCameraOn(!isCameraOn)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                isCameraOn 
                                    ? 'bg-gray-700 hover:bg-gray-600' 
                                    : 'bg-red-500 hover:bg-red-600'
                            }`}
                        >
                            {isCameraOn ? (
                                <Video size={20} className="text-white" />
                            ) : (
                                <VideoOff size={20} className="text-white" />
                            )}
                        </button>

                        {/* Mic Toggle */}
                        <button
                            onClick={() => setIsMicOn(!isMicOn)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                isMicOn 
                                    ? 'bg-gray-700 hover:bg-gray-600' 
                                    : 'bg-red-500 hover:bg-red-600'
                            }`}
                        >
                            {isMicOn ? (
                                <Mic size={20} className="text-white" />
                            ) : (
                                <MicOff size={20} className="text-white" />
                            )}
                        </button>

                        {/* Screen Share (Teacher only) */}
                        {isTeacher && (
                            <button
                                onClick={() => setIsScreenSharing(!isScreenSharing)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                    isScreenSharing 
                                        ? 'bg-blue-500 hover:bg-blue-600' 
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <Monitor size={20} className="text-white" />
                            </button>
                        )}

                        {/* Raise Hand (Student only) */}
                        {!isTeacher && (
                            <button className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all">
                                <Hand size={20} className="text-white" />
                            </button>
                        )}

                        {/* Chat */}
                        <button className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all">
                            <MessageSquare size={20} className="text-white" />
                        </button>

                        {/* Settings */}
                        <button className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-all">
                            <Settings size={20} className="text-white" />
                        </button>

                        {/* End Call */}
                        <button
                            onClick={endSession}
                            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all ml-4"
                        >
                            <Phone size={20} className="text-white rotate-135" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Session Info */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="font-bold text-black">Live Session in Progress</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                            <Users size={16} />
                            6 participants
                        </span>
                        <span>Duration: 15:32</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCallSection;
