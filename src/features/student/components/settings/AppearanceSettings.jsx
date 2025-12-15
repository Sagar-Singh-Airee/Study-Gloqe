// src/components/settings/AppearanceSettings.jsx
import { useState, useEffect } from 'react';
import { Palette, Moon, Sun, Monitor, Type, Layout } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

const AppearanceSettings = ({ onChangeDetected }) => {
    const { user } = useAuth();
    const [appearance, setAppearance] = useState({
        theme: 'light', // light, dark, auto
        accentColor: '#000000',
        fontSize: 'medium', // small, medium, large
        sidebarBehavior: 'always', // always, auto
        compactMode: false
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAppearanceSettings();
    }, [user]);

    const loadAppearanceSettings = async () => {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().appearance) {
                setAppearance(userDoc.data().appearance);
            }
        } catch (error) {
            console.error('Error loading appearance settings:', error);
        }
    };

    const handleThemeChange = (theme) => {
        setAppearance(prev => ({ ...prev, theme }));
        onChangeDetected(true);
        
        // Apply theme immediately for preview
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // Auto mode
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.classList.toggle('dark', isDark);
        }
    };

    const handleColorChange = (color) => {
        setAppearance(prev => ({ ...prev, accentColor: color }));
        onChangeDetected(true);
    };

    const handleFontSizeChange = (size) => {
        setAppearance(prev => ({ ...prev, fontSize: size }));
        onChangeDetected(true);
    };

    const handleToggle = (key) => {
        setAppearance(prev => ({ ...prev, [key]: !prev[key] }));
        onChangeDetected(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                appearance,
                updatedAt: new Date()
            });

            toast.success('🎨 Appearance settings saved!', {
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

    const accentColors = [
        { name: 'Black', value: '#000000' },
        { name: 'Blue', value: '#3B82F6' },
        { name: 'Purple', value: '#8B5CF6' },
        { name: 'Pink', value: '#EC4899' },
        { name: 'Green', value: '#10B981' },
        { name: 'Orange', value: '#F59E0B' },
        { name: 'Red', value: '#EF4444' }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-black mb-2">Appearance Settings</h2>
                <p className="text-gray-500 text-sm">Customize the look and feel of your dashboard</p>
            </div>

            {/* Theme Mode */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Palette size={20} className="text-black" />
                    <h3 className="font-black text-black">Theme Mode</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => handleThemeChange('light')}
                        className={`p-6 rounded-2xl border-2 transition-all ${
                            appearance.theme === 'light'
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <Sun size={32} className="mx-auto mb-3 text-black" />
                        <div className="font-bold text-black">Light</div>
                        <div className="text-xs text-gray-500 mt-1">Bright & clean</div>
                    </button>

                    <button
                        onClick={() => handleThemeChange('dark')}
                        className={`p-6 rounded-2xl border-2 transition-all ${
                            appearance.theme === 'dark'
                                ? 'border-black bg-gray-900 text-white'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <Moon size={32} className="mx-auto mb-3" />
                        <div className="font-bold">Dark</div>
                        <div className="text-xs opacity-70 mt-1">Easy on eyes</div>
                    </button>

                    <button
                        onClick={() => handleThemeChange('auto')}
                        className={`p-6 rounded-2xl border-2 transition-all ${
                            appearance.theme === 'auto'
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <Monitor size={32} className="mx-auto mb-3 text-black" />
                        <div className="font-bold text-black">Auto</div>
                        <div className="text-xs text-gray-500 mt-1">System default</div>
                    </button>
                </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Palette size={20} className="text-black" />
                    <h3 className="font-black text-black">Accent Color</h3>
                </div>

                <div className="grid grid-cols-7 gap-3">
                    {accentColors.map((color) => (
                        <button
                            key={color.value}
                            onClick={() => handleColorChange(color.value)}
                            className={`aspect-square rounded-xl transition-all border-4 ${
                                appearance.accentColor === color.value
                                    ? 'border-gray-300 scale-110'
                                    : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                        >
                            {appearance.accentColor === color.value && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-3 h-3 bg-white rounded-full" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-sm text-gray-500">Selected: {accentColors.find(c => c.value === appearance.accentColor)?.name || 'Custom'}</p>
            </div>

            {/* Font Size */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Type size={20} className="text-black" />
                    <h3 className="font-black text-black">Font Size</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => handleFontSizeChange('small')}
                        className={`p-6 rounded-2xl border-2 transition-all ${
                            appearance.fontSize === 'small'
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="text-sm font-bold text-black mb-2">Small</div>
                        <div className="text-xs text-gray-500">Compact view</div>
                    </button>

                    <button
                        onClick={() => handleFontSizeChange('medium')}
                        className={`p-6 rounded-2xl border-2 transition-all ${
                            appearance.fontSize === 'medium'
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="text-base font-bold text-black mb-2">Medium</div>
                        <div className="text-xs text-gray-500">Default size</div>
                    </button>

                    <button
                        onClick={() => handleFontSizeChange('large')}
                        className={`p-6 rounded-2xl border-2 transition-all ${
                            appearance.fontSize === 'large'
                                ? 'border-black bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className="text-lg font-bold text-black mb-2">Large</div>
                        <div className="text-xs text-gray-500">Easier to read</div>
                    </button>
                </div>
            </div>

            {/* Layout Options */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Layout size={20} className="text-black" />
                    <h3 className="font-black text-black">Layout Options</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                        <div className="flex-1">
                            <div className="font-bold text-black mb-1">Compact Mode</div>
                            <div className="text-sm text-gray-500">Reduce spacing between elements</div>
                        </div>
                        <button
                            onClick={() => handleToggle('compactMode')}
                            className={`relative w-14 h-7 rounded-full transition-all ${
                                appearance.compactMode ? 'bg-black' : 'bg-gray-300'
                            }`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                    appearance.compactMode ? 'translate-x-7' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-black">Sidebar Behavior</div>
                        </div>
                        <select
                            value={appearance.sidebarBehavior}
                            onChange={(e) => {
                                setAppearance(prev => ({ ...prev, sidebarBehavior: e.target.value }));
                                onChangeDetected(true);
                            }}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-black focus:outline-none focus:border-black"
                        >
                            <option value="always">Always Visible</option>
                            <option value="auto">Auto Hide</option>
                        </select>
                    </div>
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
                    {loading ? 'Saving...' : 'Save Appearance'}
                </button>
            </div>
        </div>
    );
};

export default AppearanceSettings;
