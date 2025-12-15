// src/components/settings/DataSettings.jsx
import { useState, useEffect } from 'react';
import { Database, Download, Trash2, HardDrive, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import toast from 'react-hot-toast';

const DataSettings = ({ onChangeDetected }) => {
    const { user } = useAuth();
    const [storageData, setStorageData] = useState({
        documents: 0,
        quizSessions: 0,
        totalSize: 0
    });
    const [loading, setLoading] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);

    useEffect(() => {
        calculateStorage();
    }, [user]);

    const calculateStorage = async () => {
        try {
            // Count documents
            const docsQuery = query(collection(db, 'documents'), where('uploaderId', '==', user.uid));
            const docsSnapshot = await getDocs(docsQuery);
            
            // Count quiz sessions
            const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', user.uid));
            const sessionsSnapshot = await getDocs(sessionsQuery);

            setStorageData({
                documents: docsSnapshot.size,
                quizSessions: sessionsSnapshot.size,
                totalSize: (docsSnapshot.size * 2.5 + sessionsSnapshot.size * 0.1).toFixed(2) // Approximate MB
            });
        } catch (error) {
            console.error('Error calculating storage:', error);
        }
    };

    const handleExportData = async () => {
        try {
            setLoading(true);
            
            // Fetch all user data
            const userData = {};
            
            // Get documents
            const docsQuery = query(collection(db, 'documents'), where('uploaderId', '==', user.uid));
            const docsSnapshot = await getDocs(docsQuery);
            userData.documents = docsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get quiz sessions
            const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', user.uid));
            const sessionsSnapshot = await getDocs(sessionsQuery);
            userData.sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Get gamification data
            const gamDoc = await getDocs(query(collection(db, 'gamification'), where('__name__', '==', user.uid)));
            if (!gamDoc.empty) {
                userData.gamification = gamDoc.docs[0].data();
            }

            // Create and download JSON file
            const dataStr = JSON.stringify(userData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `studygloqe-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success('📥 Data exported successfully!', {
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '16px 24px',
                },
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to export data');
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = async () => {
        try {
            setLoading(true);
            
            // Clear localStorage cache
            const keysToKeep = [`lastLogin_${user.uid}`];
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });

            // Clear sessionStorage
            sessionStorage.clear();

            toast.success('🗑️ Cache cleared successfully!', {
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '16px 24px',
                },
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to clear cache');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOldSessions = async () => {
        try {
            setLoading(true);
            
            // Delete sessions older than 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const sessionsQuery = query(
                collection(db, 'sessions'),
                where('userId', '==', user.uid)
            );
            const sessionsSnapshot = await getDocs(sessionsQuery);
            
            let deletedCount = 0;
            for (const docSnapshot of sessionsSnapshot.docs) {
                const session = docSnapshot.data();
                if (session.startTs && session.startTs.toDate() < thirtyDaysAgo) {
                    await deleteDoc(doc(db, 'sessions', docSnapshot.id));
                    deletedCount++;
                }
            }

            toast.success(`🗑️ Deleted ${deletedCount} old sessions!`, {
                style: {
                    background: '#000',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    padding: '16px 24px',
                },
            });
            
            setShowClearModal(false);
            calculateStorage();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete sessions');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-black mb-2">Data & Storage</h2>
                <p className="text-gray-500 text-sm">Manage your data, storage usage, and account information</p>
            </div>

            {/* Storage Overview */}
            <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-2xl text-white">
                <div className="flex items-center gap-3 mb-6">
                    <HardDrive size={24} />
                    <h3 className="text-xl font-black">Storage Usage</h3>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                        <FileText size={20} className="mb-2 opacity-70" />
                        <div className="text-3xl font-black mb-1">{storageData.documents}</div>
                        <div className="text-sm opacity-70">Documents</div>
                    </div>

                    <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                        <Database size={20} className="mb-2 opacity-70" />
                        <div className="text-3xl font-black mb-1">{storageData.quizSessions}</div>
                        <div className="text-sm opacity-70">Quiz Sessions</div>
                    </div>

                    <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                        <HardDrive size={20} className="mb-2 opacity-70" />
                        <div className="text-3xl font-black mb-1">{storageData.totalSize} MB</div>
                        <div className="text-sm opacity-70">Total Size</div>
                    </div>
                </div>

                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${Math.min((storageData.totalSize / 100) * 100, 100)}%` }}
                    />
                </div>
                <p className="text-xs opacity-70 mt-2">Using {storageData.totalSize} MB of your storage</p>
            </div>

            {/* Data Management */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Database size={20} className="text-black" />
                    <h3 className="font-black text-black">Data Management</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <button
                        onClick={handleExportData}
                        disabled={loading}
                        className="p-6 bg-gray-50 border border-gray-200 rounded-2xl hover:border-black hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={32} className="mb-4 text-black group-hover:scale-110 transition-transform" />
                        <h4 className="font-black text-black mb-2">Export All Data</h4>
                        <p className="text-sm text-gray-500">Download a copy of all your data as JSON</p>
                    </button>

                    <button
                        onClick={handleClearCache}
                        disabled={loading}
                        className="p-6 bg-gray-50 border border-gray-200 rounded-2xl hover:border-black hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={32} className="mb-4 text-black group-hover:scale-110 transition-transform" />
                        <h4 className="font-black text-black mb-2">Clear Cache</h4>
                        <p className="text-sm text-gray-500">Free up space by clearing temporary data</p>
                    </button>
                </div>
            </div>

            {/* Cleanup Options */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                    <Trash2 size={20} className="text-black" />
                    <h3 className="font-black text-black">Cleanup Options</h3>
                </div>

                <div className="p-6 bg-orange-50 border border-orange-200 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <AlertCircle size={24} className="text-orange-600 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-black text-orange-900 mb-2">Delete Old Quiz Sessions</h4>
                            <p className="text-sm text-orange-700 mb-4">
                                Remove quiz sessions older than 30 days to free up storage space. This action cannot be undone.
                            </p>
                            <button
                                onClick={() => setShowClearModal(true)}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all"
                            >
                                Delete Old Sessions
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-start gap-4">
                    <AlertCircle size={24} className="text-blue-600 flex-shrink-0" />
                    <div>
                        <h4 className="font-black text-blue-900 mb-2">About Your Data</h4>
                        <p className="text-sm text-blue-700">
                            Your data is securely stored and encrypted. We never share your personal information with third parties. 
                            You can request complete data deletion from the Account Settings page.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cleanup Confirmation Modal */}
            {showClearModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={32} className="text-orange-600" />
                        </div>
                        <h3 className="text-2xl font-black text-black text-center mb-2">Delete Old Sessions?</h3>
                        <p className="text-gray-600 text-center mb-6">
                            This will permanently delete quiz sessions older than 30 days. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClearModal(false)}
                                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-all text-black"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteOldSessions}
                                disabled={loading}
                                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataSettings;
