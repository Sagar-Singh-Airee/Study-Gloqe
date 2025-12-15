// src/components/settings/ProfileSettings.jsx
import { useState, useEffect } from 'react';
import { Camera, Upload, X, Loader, Save, User, Mail, Phone, Calendar, GraduationCap, BookOpen, FileText, CheckCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { storage } from '@shared/config/firebase';
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
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)',
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
        <div className="space-y-8">
            {/* Professional Premium Header Card */}
            <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-white border border-gray-100">
                {/* Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 opacity-80"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 to-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-400/5 to-blue-500/5 rounded-full blur-3xl translate-y-1/4 -translate-x-1/3"></div>

                {/* Content */}
                <div className="relative z-10 px-8 py-12 md:py-16">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        {/* Left Section */}
                        <div className="flex-1">
                            {/* Badge */}
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-50 border border-blue-200 rounded-full mb-4">
                                <Sparkles size={16} className="text-blue-600 animate-pulse" />
                                <span className="text-sm font-bold text-blue-700">Profile Management</span>
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 leading-tight">
                                Edit Your <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Profile</span>
                            </h1>

                            {/* Description */}
                            <p className="text-gray-600 text-base md:text-lg font-medium max-w-2xl">
                                Keep your profile up-to-date with current information. Your profile helps others learn more about you.
                            </p>
                        </div>

                        {/* Right Section - Quick Stats */}
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            <div className="px-6 py-4 bg-white border border-gray-200 rounded-2xl backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                                        <CheckCircle size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-semibold">Profile Status</p>
                                        <p className="text-sm font-bold text-gray-900">Active & Verified</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-white border border-gray-200 rounded-2xl backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                                        <User size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-semibold">Last Updated</p>
                                        <p className="text-sm font-bold text-gray-900">Just now</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Picture Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-5xl font-black overflow-hidden shadow-2xl ring-4 ring-blue-100 transition-all duration-300 group-hover:scale-105 group-hover:ring-8 group-hover:ring-blue-200">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-white">{formData.name?.charAt(0) || 'U'}</span>
                            )}
                        </div>
                        <label
                            htmlFor="profile-upload"
                            className="absolute -bottom-3 -right-3 w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl flex items-center justify-center cursor-pointer transition-all shadow-2xl hover:shadow-xl hover:scale-125 group"
                        >
                            <Camera size={24} className="text-white" />
                        </label>
                        <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Profile Picture</h3>
                        <p className="text-gray-600 mb-1 font-medium">Make a great first impression</p>
                        <p className="text-sm text-gray-500 mb-6 font-medium">Recommended: Clear, well-lit photo (PNG, JPG up to 5MB)</p>
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            <label
                                htmlFor="profile-upload"
                                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-bold cursor-pointer transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2 group"
                            >
                                <Upload size={18} className="group-hover:scale-110 transition-transform" />
                                Upload New Photo
                            </label>
                            {previewUrl && (
                                <button
                                    onClick={handleRemovePhoto}
                                    className="px-8 py-4 bg-gray-100 hover:bg-red-50 text-red-600 rounded-2xl text-sm font-bold transition-all hover:scale-105 flex items-center gap-2"
                                >
                                    <X size={18} />
                                    Remove Photo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-300">
                <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                        <User size={24} className="text-white" />
                    </div>
                    Personal Information
                </h3>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Full Name */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <User size={16} className="text-blue-600" />
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-400 hover:border-gray-300 shadow-sm hover:shadow-md"
                            placeholder="Enter your full name"
                        />
                    </div>

                    {/* Student ID */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <FileText size={16} className="text-blue-600" />
                            Student ID
                        </label>
                        <input
                            type="text"
                            name="studentId"
                            value={formData.studentId}
                            onChange={handleInputChange}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-400 hover:border-gray-300 shadow-sm hover:shadow-md"
                            placeholder="12345678"
                        />
                    </div>

                    {/* Email */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <Mail size={16} className="text-blue-600" />
                            Email Address
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-600 font-medium cursor-not-allowed shadow-sm"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                    <CheckCircle size={14} className="text-green-600" />
                                    <span className="text-xs font-bold text-green-700">Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <Phone size={16} className="text-blue-600" />
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-400 hover:border-gray-300 shadow-sm hover:shadow-md"
                            placeholder="+91 1234567890"
                        />
                    </div>

                    {/* Date of Birth */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <Calendar size={16} className="text-blue-600" />
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            name="dateOfBirth"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium hover:border-gray-300 shadow-sm hover:shadow-md"
                        />
                    </div>

                    {/* Grade/Year */}
                    <div className="group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <GraduationCap size={16} className="text-blue-600" />
                            Grade/Year
                        </label>
                        <select
                            name="grade"
                            value={formData.grade}
                            onChange={handleInputChange}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium hover:border-gray-300 cursor-pointer shadow-sm hover:shadow-md"
                        >
                            <option value="">Select your grade</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="Graduate">Graduate</option>
                        </select>
                    </div>

                    {/* Major/Course */}
                    <div className="md:col-span-2 group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <BookOpen size={16} className="text-blue-600" />
                            Major/Course
                        </label>
                        <input
                            type="text"
                            name="major"
                            value={formData.major}
                            onChange={handleInputChange}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-400 hover:border-gray-300 shadow-sm hover:shadow-md"
                            placeholder="e.g. Computer Science & Engineering"
                        />
                    </div>

                    {/* Bio */}
                    <div className="md:col-span-2 group">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                            <FileText size={16} className="text-blue-600" />
                            Bio / About You
                        </label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleInputChange}
                            rows={5}
                            maxLength={200}
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none text-gray-900 font-medium placeholder:text-gray-400 hover:border-gray-300 shadow-sm hover:shadow-md"
                            placeholder="Tell us about yourself, your interests, and goals..."
                        />
                        <div className="flex items-center justify-between mt-3 px-2">
                            <p className="text-xs text-gray-500 font-bold">{formData.bio.length}/200 characters</p>
                            <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 transition-all duration-300"
                                    style={{ width: `${(formData.bio.length / 200) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <button
                    onClick={() => window.location.reload()}
                    className="px-10 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold text-gray-700 transition-all hover:scale-105 shadow-md hover:shadow-lg border border-gray-200"
                >
                    Cancel Changes
                </button>
                <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="px-10 py-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-2xl hover:scale-105 border border-blue-700"
                >
                    {uploading ? (
                        <>
                            <Loader size={20} className="animate-spin" />
                            Saving Your Changes...
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ProfileSettings;
