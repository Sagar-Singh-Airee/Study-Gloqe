// src/components/settings/ProfileSettings.jsx
import { useState, useEffect } from 'react';
import { Camera, Upload, X, Loader, Save } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { db, storage } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

const ProfileSettings = ({ onChangeDetected }) => {
    const { user, userData } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        phone: '',
        studentId: '',
        grade: '',
        major: '',
        dateOfBirth: ''
    });
    const [profileImage, setProfileImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(userData?.photoURL || '');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (userData) {
            setFormData({
                name: userData.name || '',
                bio: userData.bio || '',
                phone: userData.phone || '',
                studentId: userData.studentId || '',
                grade: userData.grade || '',
                major: userData.major || '',
                dateOfBirth: userData.dateOfBirth || ''
            });
            setPreviewUrl(userData.photoURL || '');
        }
    }, [userData]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB');
                return;
            }
            setProfileImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            onChangeDetected(true);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        onChangeDetected(true);
    };

    const handleRemovePhoto = () => {
        setProfileImage(null);
        setPreviewUrl('');
        onChangeDetected(true);
    };

    const handleSave = async () => {
        try {
            setUploading(true);
            let photoURL = previewUrl;

            // Upload profile image if changed
            if (profileImage) {
                const storageRef = ref(storage, `profileImages/${user.uid}`);
                await uploadBytes(storageRef, profileImage);
                photoURL = await getDownloadURL(storageRef);
            }

            // Update Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                ...formData,
                photoURL,
                updatedAt: new Date()
            });

            toast.success('✅ Profile updated successfully!', {
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
            toast.error('Failed to update profile');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-black mb-2">Profile Settings</h2>
                <p className="text-gray-500 text-sm">Update your personal information and profile picture</p>
            </div>

            {/* Profile Picture */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center text-3xl font-bold overflow-hidden">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white">{formData.name?.charAt(0) || 'U'}</span>
                        )}
                    </div>
                    <label
                        htmlFor="profile-upload"
                        className="absolute bottom-0 right-0 w-8 h-8 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-lg"
                    >
                        <Camera size={16} className="text-white" />
                    </label>
                    <input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                    />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-black mb-1">Profile Picture</h3>
                    <p className="text-sm text-gray-500 mb-3">PNG, JPG up to 5MB</p>
                    <div className="flex gap-2">
                        <label
                            htmlFor="profile-upload"
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg text-sm font-bold cursor-pointer transition-all"
                        >
                            Upload New
                        </label>
                        {previewUrl && (
                            <button
                                onClick={handleRemovePhoto}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold transition-all"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Form Fields */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-black mb-2">Full Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                        placeholder="Enter your full name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2">Student ID</label>
                    <input
                        type="text"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                        placeholder="12345678"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2">Email Address</label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-medium cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                        placeholder="+91 1234567890"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2">Date of Birth</label>
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-black mb-2">Grade/Year</label>
                    <select
                        name="grade"
                        value={formData.grade}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                    >
                        <option value="">Select your grade</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Graduate">Graduate</option>
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-black mb-2">Major/Course</label>
                    <input
                        type="text"
                        name="major"
                        value={formData.major}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all text-black font-medium"
                        placeholder="e.g. Computer Science & Engineering"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-black mb-2">Bio</label>
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        maxLength={200}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all resize-none text-black font-medium"
                        placeholder="Tell us about yourself..."
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/200 characters</p>
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
                    disabled={uploading}
                    className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {uploading ? (
                        <>
                            <Loader size={18} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ProfileSettings;
