// src/components/settings/NotificationSettings.jsx
import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Trophy, Calendar, Zap } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

const NotificationSettings = ({ onChangeDetected }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState({
        emailNotifications: true,
        pushNotifications: true,
        quizReminders: true,
        documentAlerts: true,
        studyRoomInvites: true,
        announcements: true,
        streakReminders: true,
        weeklyReports: true,
        leaderboardUpdates: false,
        newFeatures: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadNotificationSettings();
    }, [user]);

    const loadNotificationSettings = async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().notifications) {
                setNotifications(userDoc.data().notifications);
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    };

    const handleToggle = (key) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
        onChangeDetected(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                notifications,
                updatedAt: new Date()
            });

            toast.success('✅ Notification settings saved!', {
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

    const notificationGroups = [
        {
            title: 'Communication',
            icon: MessageSquare,
            items: [
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
                { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive push notifications in browser' },
                { key: 'announcements', label: 'Announcements', desc: 'Important updates from teachers' }
            ]
        },
        {
            title: 'Learning',
            icon: Zap,
            items: [
                { key: 'quizReminders', label: 'Quiz Reminders', desc: 'Reminders for upcoming quizzes' },
                { key: 'documentAlerts', label: 'Document Alerts', desc: 'Notifications when document processing completes' },
                { key: 'studyRoomInvites', label: 'Study Room Invites', desc: 'Invitations to join study rooms' }
            ]
        },
        {
            title: 'Progress',
            icon: Trophy,
            items: [
                { key: 'streakReminders', label: 'Streak Reminders', desc: 'Daily reminders to maintain your streak' },
                { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Summary of your weekly progress' },
                { key: 'leaderboardUpdates', label: 'Leaderboard Updates', desc: 'Changes in your leaderboard position' }
            ]
        },
        {
            title: 'Platform',
            icon: Bell,
            items: [
                { key: 'newFeatures', label: 'New Features', desc: 'Updates about new platform features' }
            ]
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-black mb-2">Notification Settings</h2>
                <p className="text-gray-500 text-sm">Manage how you receive notifications and updates</p>
            </div>

            {/* Notification Groups */}
            {notificationGroups.map((group, idx) => (
                <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                        <group.icon size={20} className="text-black" />
                        <h3 className="font-black text-black">{group.title}</h3>
                    </div>

                    <div className="space-y-3">
                        {group.items.map((item) => (
                            <div
                                key={item.key}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
                            >
                                <div className="flex-1">
                                    <div className="font-bold text-black mb-1">{item.label}</div>
                                    <div className="text-sm text-gray-500">{item.desc}</div>
                                </div>
                                <button
                                    onClick={() => handleToggle(item.key)}
                                    className={`relative w-14 h-7 rounded-full transition-all ${
                                        notifications[item.key]
                                            ? 'bg-black'
                                            : 'bg-gray-300'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                            notifications[item.key] ? 'translate-x-7' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

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

export default NotificationSettings;
