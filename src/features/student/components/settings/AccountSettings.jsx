// src/components/settings/AccountSettings.jsx
import { useState } from 'react';
import { Shield, Mail, Key, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { 
    updatePassword, 
    EmailAuthProvider, 
    reauthenticateWithCredential,
    deleteUser 
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const AccountSettings = ({ onChangeDetected }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async () => {
        if (passwords.new !== passwords.confirm) {
            toast.error('New passwords do not match');
            return;
        }

        if (passwords.new.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);
            
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(
                user.email,
                passwords.current
            );
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, passwords.new);

            toast.success('🔒 Password updated successfully!', {
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '16px 24px',
                },
            });

            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                toast.error('Current password is incorrect');
            } else {
                toast.error('Failed to update password');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }

        try {
            setLoading(true);

            // Delete user data from Firestore
            await deleteDoc(doc(db, 'users', user.uid));
            await deleteDoc(doc(db, 'gamification', user.uid));

            // Delete user account
            await deleteUser(user);

            toast.success('Account deleted successfully');
            navigate('/');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete account. You may need to re-login first.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-black mb-2">Account Settings</h2>
                <p className="text-gray-500 text-sm">Manage your account security and preferences</p>
            </div>

            {/* Email Section */}
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
                        <Mail size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-black mb-1">Email Address</h3>
                        <p className="text-gray-600 mb-3">{user?.email}</p>
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <Shield size={14} />
                            <span className="font-bold">Verified</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Key size={20} className="text-black" />
                    <h3 className="font-black text-black">Change Password</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-black mb-2">Current Password</label>
                        <input
                            type="password"
                            value={passwords.current}
                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                            placeholder="Enter current password"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-black mb-2">New Password</label>
                            <input
                                type="password"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                                placeholder="At least 6 characters"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-black mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                                placeholder="Re-enter new password"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handlePasswordChange}
                        disabled={loading || !passwords.current || !passwords.new || !passwords.confirm}
                        className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>
            </div>

            {/* Delete Account */}
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-red-700 mb-2">Danger Zone</h3>
                        <p className="text-red-600 text-sm mb-4">
                            Once you delete your account, there is no going back. All your data, documents, and progress will be permanently deleted.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                        >
                            <Trash2 size={18} />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-2xl font-black text-black text-center mb-2">Delete Account?</h3>
                        <p className="text-gray-600 text-center mb-6">
                            This action cannot be undone. Type <span className="font-bold text-black">DELETE</span> to confirm.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all text-black font-bold text-center mb-4"
                            placeholder="Type DELETE"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmation('');
                                }}
                                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-black"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== 'DELETE' || loading}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountSettings;
