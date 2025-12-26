import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Video, Calendar as CalendarIcon,
    Clock, BookOpen, Sparkles, Plus,
    Link as LinkIcon, AlertCircle, CheckCircle2
} from 'lucide-react';
import { createLiveSession } from '../../services/liveSessionService';
import toast from 'react-hot-toast';
import { useAuth } from '@auth/contexts/AuthContext';

const LiveSessionCreator = ({ onClose, classes = [] }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        topic: '',
        classId: classes[0]?.id || '',
        date: '',
        startTime: '',
        duration: '60',
        meetingLink: '',
        description: ''
    });

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.classId || !formData.date || !formData.startTime) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const selectedClass = classes.find(c => c.id === formData.classId);

            await createLiveSession({
                ...formData,
                teacherId: user.uid,
                className: selectedClass?.name || 'Unknown Class',
                classSubject: selectedClass?.subject || 'General'
            });

            toast.success('✅ Live session scheduled!');
            onClose();
        } catch (error) {
            console.error('Error scheduling session:', error);
            toast.error('❌ Failed to schedule session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] border-2 border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-black px-8 py-6 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                            <Video size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black">Schedule Live Session</h2>
                            <p className="text-sm text-gray-400 font-medium">Create a Google Meet for your class</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
                    {/* Class Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <BookOpen size={16} className="text-gray-400" />
                                Select Class
                            </label>
                            <select
                                value={formData.classId}
                                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-all font-bold text-gray-900"
                                required
                            >
                                <option value="">Select a class...</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name} ({cls.subject})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <Sparkles size={16} className="text-gray-400" />
                                Session Topic
                            </label>
                            <input
                                type="text"
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                placeholder="e.g., Quantum Physics Review"
                                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-all font-bold text-gray-900"
                                required
                            />
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <CalendarIcon size={16} className="text-gray-400" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-all font-bold text-gray-900"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" />
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-all font-bold text-gray-900"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-gray-900">
                                Duration (min)
                            </label>
                            <select
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-all font-bold text-gray-900"
                            >
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                                <option value="90">90 min</option>
                                <option value="120">120 min</option>
                            </select>
                        </div>
                    </div>

                    {/* Meeting Link */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <LinkIcon size={16} className="text-gray-400" />
                                Google Meet Link
                            </label>
                            <button
                                type="button"
                                className="text-xs font-black text-blue-600 hover:text-blue-700 transition-colors"
                                onClick={() => {
                                    // Simulation for now
                                    const mockLink = `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
                                    setFormData({ ...formData, meetingLink: mockLink });
                                    toast.success('Generated simulated Google Meet link!');
                                }}
                            >
                                Auto-Generate Link
                            </button>
                        </div>
                        <input
                            type="url"
                            value={formData.meetingLink}
                            onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                            placeholder="https://meet.google.com/xxx-xxxx-xxx"
                            className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-all font-bold text-gray-900"
                        />
                        <p className="text-[10px] text-gray-500 font-medium">
                            Paste your Google Meet link here or use the generator above.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-black text-gray-900">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Topics to cover, prerequisites, etc."
                            rows={3}
                            className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-black transition-all font-medium text-gray-900 resize-none"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-8 border-t-2 border-gray-50 bg-gray-50/50 flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-white border-2 border-gray-200 text-gray-900 rounded-2xl font-black hover:bg-gray-50 active:scale-95 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="flex-[2] px-6 py-4 bg-black text-white rounded-2xl font-black hover:shadow-xl hover:shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Plus size={20} />
                                Schedule Live Session
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default LiveSessionCreator;
