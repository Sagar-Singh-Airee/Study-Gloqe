// src/components/settings/PrivacySettings.jsx
import { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Lock, Users } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

const PrivacySettings = ({ onChangeDetected }) => {
    const { user } = useAuth();
    const [privacy, setPrivacy] = useState({
        profileVisibility: 'public',
        showStatsOnLeaderboard: true,
        allowDocumentSharing: true,
        allowStudyRoomInvites: true,
        showActivityStatus: true,
        dataCollection: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPrivacySettings();
    }, [user]);

    const loadPrivacySettings = async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().privacy) {
                setPrivacy(userDoc.data().privacy);
            }
        } catch (error) {
            console.error('Error loading privacy settings:', error);
        }
    };

    const handleToggle = (key) => {
        setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));
        onChangeDetected(true);
    };

    const handleVisibilityChange = (value) => {
        setPrivacy(prev => ({ ...prev, profileVisibility: value }));
        onChangeDetected(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                privacy,
                updatedAt: new Date()
            });

            toast.success('🔒 Privacy settings saved!', {
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
                <h2 className="text-2xl font-black text-black mb-2">Privacy Settings</h2>
                <p className="text-gray-500 text-sm">Control who can see your information and activity</p>
            </div>

            {/* Profile Visibility */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Eye size={20} className="text-black" />
                    <h3 className="font-black text-black">Profile Visibility</h3>
                </div>

                <div className="grid gap-3">
                    <label className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-all border-2 border-transparent has-[:checked]:border-black">
                        <input
                            type="radio"
                            name="visibility"
                            checked={privacy.profileVisibility === 'public'}
                            onChange={() => handleVisibilityChange('public')}
                            className="w-5 h-5 text-black"
                        />
                        <div className="ml-4">
                            <div className="font-bold text-black">Public</div>
                            <div className="text-sm text-gray-500">Anyone can view your profile and stats</div>
                        </div>
                    </label>

                    <label className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-all border-2 border-transparent has-[:checked]:border-black">
                        <input
                            type="radio"
                            name="visibility"
                            checked={privacy.profileVisibility === 'friends'}
                            onChange={() => handleVisibilityChange('friends')}
                            className="w-5 h-5 text-black"
                        />
                        <div className="ml-4">
                            <div className="font-bold text-black">Friends Only</div>
                            <div className="text-sm text-gray-500">Only your classmates can see your profile</div>
                        </div>
                    </label>

                    <label className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-all border-2 border-transparent has-[:checked]:border-black">
                        <input
                            type="radio"
                            name="visibility"
                            checked={privacy.profileVisibility === 'private'}
                            onChange={() => handleVisibilityChange('private')}
                            className="w-5 h-5 text-black"
                        />
                        <div className="ml-4">
                            <div className="font-bold text-black">Private</div>
                            <div className="text-sm text-gray-500">Only you can see your profile</div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Activity & Sharing */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Users size={20} className="text-black" />
                    <h3 className="font-black text-black">Activity & Sharing</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                        <div className="flex-1">
                            <div className="font-bold text-black mb-1">Show Stats on Leaderboard</div>
                            <div className="text-sm text-gray-500">Display your XP and rank publicly</div>
                        </div>
                        <button
                            onClick={() => handleToggle('showStatsOnLeaderboard')}
                            className={`relative w-14 h-7 rounded-full transition-all ${
                                privacy.showStatsOnLeaderboard ? 'bg-black' : 'bg-gray-300'
                            }`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                    privacy.showStatsOnLeaderboard ? 'translate-x-7' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                        <div className="flex-1">
                            <div className="font-bold text-black mb-1">Allow Document Sharing</div>
                            <div className="text-sm text-gray-500">Let others see documents you share</div>
                        </div>
                        <button
                            onClick={() => handleToggle('allowDocumentSharing')}
                            className={`relative w-14 h-7 rounded-full transition-all ${
                                privacy.allowDocumentSharing ? 'bg-black' : 'bg-gray-300'
                            }`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                    privacy.allowDocumentSharing ? 'translate-x-7' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                        <div className="flex-1">
                            <div className="font-bold text-black mb-1">Study Room Invites</div>
                            <div className="text-sm text-gray-500">Allow others to invite you to study rooms</div>
                        </div>
                        <button
                            onClick={() => handleToggle('allowStudyRoomInvites')}
                            className={`relative w-14 h-7 rounded-full transition-all ${
                                privacy.allowStudyRoomInvites ? 'bg-black' : 'bg-gray-300'
                            }`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                    privacy.allowStudyRoomInvites ? 'translate-x-7' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                        <div className="flex-1">
                            <div className="font-bold text-black mb-1">Activity Status</div>
                            <div className="text-sm text-gray-500">Show when you're online</div>
                        </div>
                        <button
                            onClick={() => handleToggle('showActivityStatus')}
                            className={`relative w-14 h-7 rounded-full transition-all ${
                                privacy.showActivityStatus ? 'bg-black' : 'bg-gray-300'
                            }`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                    privacy.showActivityStatus ? 'translate-x-7' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Collection */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Lock size={20} className="text-black" />
                    <h3 className="font-black text-black">Data & Analytics</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                    <div className="flex-1">
                        <div className="font-bold text-black mb-1">Usage Analytics</div>
                        <div className="text-sm text-gray-500">Help improve the platform by sharing usage data</div>
                    </div>
                    <button
                        onClick={() => handleToggle('dataCollection')}
                        className={`relative w-14 h-7 rounded-full transition-all ${
                            privacy.dataCollection ? 'bg-black' : 'bg-gray-300'
                        }`}
                    >
                        <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                privacy.dataCollection ? 'translate-x-7' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
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
                    {loading ? 'Saving...' : 'Save Privacy Settings'}
                </button>
            </div>
        </div>
    );
};

export default PrivacySettings;
