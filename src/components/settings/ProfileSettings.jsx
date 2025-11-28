// src/components/settings/ProfileSettings.jsx
import { useState, useEffect } from 'react';
import { Camera, Loader, Save } from 'lucide-react';
import { useAuth } from '@contexts/AuthContext';
import { storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

const ProfileSettings = ({ onChangeDetected }) => {
    const { user, userData, updateUserProfile } = useAuth();
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
            setPreviewUrl(userData.photoURL || userData.profilePicture || '');
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
            console.log('💾 Starting profile save...');

            let photoURL = previewUrl;

            if (profileImage) {
                console.log('📤 Uploading profile image...');
                const storageRef = ref(storage, `avatars/${user.uid}/${profileImage.name}`);
                await uploadBytes(storageRef, profileImage);
                photoURL = await getDownloadURL(storageRef);
                console.log('✅ Image uploaded:', photoURL);
            }

            const updateData = {
                name: formData.name,
                bio: formData.bio,
                phone: formData.phone,
                studentId: formData.studentId,
                grade: formData.grade,
                major: formData.major,
                dateOfBirth: formData.dateOfBirth,
                profilePicture: photoURL,
                photoURL: photoURL
            };

            console.log('📝 Calling updateUserProfile with:', updateData);
            await updateUserProfile(updateData);

            toast.success('✅ Profile updated successfully!', {
                style: {
                    background: '#1e3a8a',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '12px 20px',
                },
            });

            onChangeDetected(false);
            setProfileImage(null);
        } catch (error) {
            console.error('❌ Save failed:', error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Profile Picture - Minimal */}
            <div className="flex items-center gap-5">
                <div className="relative group">
                    <div className="w-18 h-18 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-xl font-bold overflow-hidden border border-gray-200 group-hover:border-blue-400 transition-colors">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white">{formData.name?.charAt(0) || 'U'}</span>
                        )}
                    </div>
                    <label
                        htmlFor="profile-upload"
                        className="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-lg"
                    >
                        <Camera size={14} className="text-white" />
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
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">Profile Photo</p>
                    <div className="flex gap-2">
                        <label
                            htmlFor="profile-upload"
                            className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors"
                        >
                            Change
                        </label>
                        {previewUrl && (
                            <button
                                onClick={handleRemovePhoto}
                                className="px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-200"></div>

            {/* Form Fields - Minimal Grid */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="Your name"
                    />
                </div>

                {/* Student ID */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Student ID</label>
                    <input
                        type="text"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="12345678"
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-xs font-medium text-gray-500 cursor-not-allowed"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="+91 98765 43210"
                    />
                </div>

                {/* Date of Birth */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date of Birth</label>
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-900"
                    />
                </div>

                {/* Grade/Year */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Grade/Year</label>
                    <select
                        name="grade"
                        value={formData.grade}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-900 cursor-pointer"
                    >
                        <option value="">Select grade</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Graduate">Graduate</option>
                    </select>
                </div>

                {/* Major/Course */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Major/Course</label>
                    <input
                        type="text"
                        name="major"
                        value={formData.major}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="e.g. Computer Science & Engineering"
                    />
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Bio</label>
                    <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={2}
                        maxLength={200}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none text-xs font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="Tell us about yourself..."
                    />
                    <div className="flex justify-end mt-0.5">
                        <p className="text-xs text-gray-500 font-medium">{formData.bio.length}/200</p>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-200"></div>

            {/* Action Buttons - Minimal */}
            <div className="flex justify-end gap-2 pt-1">
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-semibold transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    {uploading ? (
                        <>
                            <Loader size={14} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={14} />
                            Save
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ProfileSettings;
