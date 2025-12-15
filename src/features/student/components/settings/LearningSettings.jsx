// src/components/settings/LearningSettings.jsx
import { useState, useEffect } from 'react';
import { Brain, Target, Clock, Zap, BookOpen } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

const LearningSettings = ({ onChangeDetected }) => {
    const { user } = useAuth();
    const [learning, setLearning] = useState({
        defaultQuizDifficulty: 'medium',
        studySessionDuration: 25,
        breakDuration: 5,
        enableBreakReminders: true,
        focusModeEnabled: false,
        aloAggressiveness: 'balanced',
        preferredSubjects: []
    });
    const [loading, setLoading] = useState(false);

    const subjects = [
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 
        'Computer Science', 'History', 'Geography', 'Literature',
        'Economics', 'Psychology', 'Engineering', 'Business'
    ];

    useEffect(() => {
        loadLearningSettings();
    }, [user]);

    const loadLearningSettings = async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().learning) {
                setLearning(userDoc.data().learning);
            }
        } catch (error) {
            console.error('Error loading learning settings:', error);
        }
    };

    const handleToggle = (key) => {
        setLearning(prev => ({ ...prev, [key]: !prev[key] }));
        onChangeDetected(true);
    };

    const handleSubjectToggle = (subject) => {
        setLearning(prev => ({
            ...prev,
            preferredSubjects: prev.preferredSubjects.includes(subject)
                ? prev.preferredSubjects.filter(s => s !== subject)
                : [...prev.preferredSubjects, subject]
        }));
        onChangeDetected(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                learning,
                updatedAt: new Date()
            });

            toast.success('📚 Learning preferences saved!', {
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '16px 24px',
                },
            });
            onChangeDetected(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-black mb-2">Learning Preferences</h2>
                <p className="text-gray-500 text-sm">Customize your study experience and AI recommendations</p>
            </div>

            {/* Quiz Settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Brain size={20} className="text-black" />
                    <h3 className="font-black text-black">Quiz Settings</h3>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block font-bold text-black mb-3">Default Quiz Difficulty</label>
                    <div className="grid grid-cols-3 gap-3">
                        {['easy', 'medium', 'hard'].map((difficulty) => (
                            <button
                                key={difficulty}
                                onClick={() => {
                                    setLearning(prev => ({ ...prev, defaultQuizDifficulty: difficulty }));
                                    onChangeDetected(true);
                                }}
                                className={`px-4 py-3 rounded-xl font-bold capitalize transition-all ${
                                    learning.defaultQuizDifficulty === difficulty
                                        ? 'bg-black text-white'
                                        : 'bg-white border border-gray-200 text-black hover:border-black'
                                }`}
                            >
                                {difficulty}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Study Session Settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Clock size={20} className="text-black" />
                    <h3 className="font-black text-black">Study Sessions</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <label className="block font-bold text-black mb-3">Session Duration (minutes)</label>
                        <input
                            type="range"
                            min="15"
                            max="60"
                            step="5"
                            value={learning.studySessionDuration}
                            onChange={(e) => {
                                setLearning(prev => ({ ...prev, studySessionDuration: parseInt(e.target.value) }));
                                onChangeDetected(true);
                            }}
                            className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                            <span>15 min</span>
                            <span className="font-black text-black">{learning.studySessionDuration} min</span>
                            <span>60 min</span>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                        <label className="block font-bold text-black mb-3">Break Duration (minutes)</label>
                        <input
                            type="range"
                            min="5"
                            max="20"
                            step="5"
                            value={learning.breakDuration}
                            onChange={(e) => {
                                setLearning(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }));
                                onChangeDetected(true);
                            }}
                            className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                            <span>5 min</span>
                            <span className="font-black text-black">{learning.breakDuration} min</span>
                            <span>20 min</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                    <div className="flex-1">
                        <div className="font-bold text-black mb-1">Break Reminders</div>
                        <div className="text-sm text-gray-500">Get notified when it's time for a break</div>
                    </div>
                    <button
                        onClick={() => handleToggle('enableBreakReminders')}
                        className={`relative w-14 h-7 rounded-full transition-all ${
                            learning.enableBreakReminders ? 'bg-black' : 'bg-gray-300'
                        }`}
                    >
                        <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                learning.enableBreakReminders ? 'translate-x-7' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                    <div className="flex-1">
                        <div className="font-bold text-black mb-1">Focus Mode</div>
                        <div className="text-sm text-gray-500">Hide distractions during study sessions</div>
                    </div>
                    <button
                        onClick={() => handleToggle('focusModeEnabled')}
                        className={`relative w-14 h-7 rounded-full transition-all ${
                            learning.focusModeEnabled ? 'bg-black' : 'bg-gray-300'
                        }`}
                    >
                        <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                learning.focusModeEnabled ? 'translate-x-7' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* ALO Algorithm Settings */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Zap size={20} className="text-black" />
                    <h3 className="font-black text-black">AI Learning Optimizer (ALO)</h3>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block font-bold text-black mb-3">Recommendation Aggressiveness</label>
                    <select
                        value={learning.aloAggressiveness}
                        onChange={(e) => {
                            setLearning(prev => ({ ...prev, aloAggressiveness: e.target.value }));
                            onChangeDetected(true);
                        }}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-black focus:outline-none focus:border-black"
                    >
                        <option value="relaxed">Relaxed - Review less frequently</option>
                        <option value="balanced">Balanced - Standard approach</option>
                        <option value="aggressive">Aggressive - Review more frequently</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Controls how often the AI suggests review sessions</p>
                </div>
            </div>

            {/* Preferred Subjects */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <BookOpen size={20} className="text-black" />
                    <h3 className="font-black text-black">Preferred Subjects</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {subjects.map((subject) => (
                        <button
                            key={subject}
                            onClick={() => handleSubjectToggle(subject)}
                            className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                learning.preferredSubjects.includes(subject)
                                    ? 'bg-black text-white'
                                    : 'bg-gray-50 border border-gray-200 text-black hover:border-black'
                            }`}
                        >
                            {subject}
                        </button>
                    ))}
                </div>
                <p className="text-sm text-gray-500">Select subjects you want to focus on for personalized recommendations</p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-black"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
};

export default LearningSettings;
