// src/pages/Settings.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    User, Lock, Bell, Shield, Palette, Database, Link as LinkIcon,
    Book, ArrowLeft, Save, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import ProfileSettings from '@student/components/settings/ProfileSettings';
import AccountSettings from '@student/components/settings/AccountSettings';
import NotificationSettings from '@student/components/settings/NotificationSettings';
import PrivacySettings from '@student/components/settings/PrivacySettings';
import AppearanceSettings from '@student/components/settings/AppearanceSettings';
import DataSettings from '@student/components/settings/DataSettings';
import LearningSettings from '@student/components/settings/LearningSettings';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [hasChanges, setHasChanges] = useState(false);
    const navigate = useNavigate();
    const { user, userData } = useAuth();

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User, component: ProfileSettings },
        { id: 'account', label: 'Account', icon: Lock, component: AccountSettings },
        { id: 'notifications', label: 'Notifications', icon: Bell, component: NotificationSettings },
        { id: 'privacy', label: 'Privacy', icon: Shield, component: PrivacySettings },
        { id: 'appearance', label: 'Appearance', icon: Palette, component: AppearanceSettings },
        { id: 'learning', label: 'Learning', icon: Book, component: LearningSettings },
        { id: 'data', label: 'Data & Storage', icon: Database, component: DataSettings },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">Settings</h1>
                            <p className="text-sm text-slate-400">Manage your account and preferences</p>
                        </div>
                    </div>

                    {hasChanges && (
                        <motion.button
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold flex items-center gap-2 transition-all"
                        >
                            <Save size={18} />
                            Save Changes
                        </motion.button>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Sidebar Navigation */}
                    <div className="col-span-12 lg:col-span-3">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-2 sticky top-24">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                                        activeTab === tab.id
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                            : 'hover:bg-slate-700/30 text-slate-300 hover:text-slate-50'
                                    }`}
                                >
                                    <tab.icon size={18} />
                                    <span className="font-medium">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="col-span-12 lg:col-span-9">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8"
                        >
                            {ActiveComponent && <ActiveComponent onChangeDetected={setHasChanges} />}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
