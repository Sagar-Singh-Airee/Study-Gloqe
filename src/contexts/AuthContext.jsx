import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    updateProfile,
    sendEmailVerification,
    deleteUser,
    reauthenticateWithCredential,
    EmailAuthProvider
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '@config/firebase';

const AuthContext = createContext({});

// Enhanced error messages
const getErrorMessage = (error) => {
    console.error('Auth Error Details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
    });

    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
        'auth/weak-password': 'Password should be at least 6 characters long.',
        'auth/user-disabled': 'This account has been disabled. Please contact support.',
        'auth/user-not-found': 'No account found with this email. Please sign up first.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        'auth/cancelled-popup-request': 'Only one popup request is allowed at a time.',
        'auth/requires-recent-login': 'Please sign in again to perform this action.',
        'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
        'permission-denied': 'Permission denied. Please check your Firestore security rules.',
    };

    return errorMessages[error.code] || error.message || 'An unexpected error occurred. Please try again.';
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [unsubscribeUserData, setUnsubscribeUserData] = useState(null);

    // Clear error after 5 seconds
    useEffect(() => {
        if (authError) {
            const timer = setTimeout(() => setAuthError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [authError]);

    // Fetch user data from Firestore with REAL-TIME updates
    const fetchUserData = useCallback(async (uid) => {
        try {
            console.log('📥 Setting up real-time listener for user:', uid);
            const userDocRef = doc(db, COLLECTIONS.USERS, uid);

            // Clean up previous listener if exists
            if (unsubscribeUserData) {
                unsubscribeUserData();
            }

            // Set up real-time listener for instant updates
            const unsubscribe = onSnapshot(
                userDocRef,
                (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        console.log('✅ User data updated in real-time:', data);
                        setUserData(data);
                    } else {
                        console.error('❌ User document does not exist');
                        setUserData(null);
                    }
                },
                (error) => {
                    console.error('❌ Error in real-time listener:', error);
                    setAuthError(getErrorMessage(error));
                }
            );

            setUnsubscribeUserData(() => unsubscribe);
            return unsubscribe;
        } catch (error) {
            console.error('❌ Error setting up user data listener:', error);
            setAuthError(getErrorMessage(error));
        }
    }, [unsubscribeUserData]);

    // Sign up with email and password
    const signup = async (email, password, additionalData = {}) => {
        try {
            console.log('🔐 Starting signup process...');
            setAuthError(null);
            setLoading(true);

            // Validate inputs
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            console.log('📝 Creating user account...');
            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
            console.log('✅ User account created:', newUser.uid);

            // Update Firebase Auth profile
            await updateProfile(newUser, {
                displayName: additionalData.name || '',
                photoURL: additionalData.photoURL || null
            });
            console.log('✅ Profile updated');

            // Create user document in Firestore
            const userDocData = {
                uid: newUser.uid,
                email: newUser.email,
                name: additionalData.name || '',
                role: ['student', 'teacher'].includes(additionalData.role) ? additionalData.role : 'student',
                photoURL: additionalData.photoURL || null,
                profilePicture: additionalData.photoURL || null,
                bio: additionalData.bio || '',
                phone: additionalData.phone || '',
                location: additionalData.location || '',
                xp: 0,
                level: 1,
                emailVerified: false,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                preferences: {
                    theme: 'dark',
                    language: 'en',
                    notifications: true,
                    emailNotifications: true,
                    studyReminders: true,
                    soundEffects: true
                },
                stats: {
                    totalStudyTime: 0,
                    coursesCompleted: 0,
                    quizzesCompleted: 0,
                    averageScore: 0,
                    documentsUploaded: 0,
                    roomsJoined: 0
                }
            };

            console.log('📝 Creating Firestore user document...');
            await setDoc(doc(db, COLLECTIONS.USERS, newUser.uid), userDocData);
            console.log('✅ User document created');

            // Initialize gamification
            console.log('🎮 Initializing gamification...');
            await setDoc(doc(db, COLLECTIONS.GAMIFICATION, newUser.uid), {
                xp: 0,
                level: 1,
                badges: [],
                achievements: [],
                streakDays: 0,
                lastActiveDate: serverTimestamp(),
                history: [],
                milestones: []
            });
            console.log('✅ Gamification initialized');

            // Send email verification
            await sendEmailVerification(newUser);
            console.log('✅ Verification email sent');

            console.log('🎉 Signup complete!');
            return newUser;
        } catch (error) {
            console.error('❌ Signup error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Login with email and password
    const login = async (email, password) => {
        try {
            console.log('🔐 Starting login process...');
            setAuthError(null);
            setLoading(true);

            // Validate inputs
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            console.log('🔑 Signing in...');
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Signed in successfully:', result.user.uid);

            // Update last login time
            console.log('📝 Updating last login time...');
            await updateDoc(doc(db, COLLECTIONS.USERS, result.user.uid), {
                lastLoginAt: serverTimestamp()
            });

            console.log('🎉 Login complete!');
            return result.user;
        } catch (error) {
            console.error('❌ Login error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Login with Google
    const loginWithGoogle = async () => {
        try {
            console.log('🔐 Starting Google login...');
            setAuthError(null);
            setLoading(true);

            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            console.log('🔑 Opening Google popup...');
            const result = await signInWithPopup(auth, provider);
            console.log('✅ Google sign-in successful:', result.user.uid);

            // Check if user document exists
            const userDocRef = doc(db, COLLECTIONS.USERS, result.user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                console.log('📝 Creating new user document...');
                const userDocData = {
                    uid: result.user.uid,
                    email: result.user.email,
                    name: result.user.displayName || '',
                    photoURL: result.user.photoURL || null,
                    profilePicture: result.user.photoURL || null,
                    role: 'student',
                    bio: '',
                    phone: '',
                    location: '',
                    xp: 0,
                    level: 1,
                    emailVerified: result.user.emailVerified,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    preferences: {
                        theme: 'dark',
                        language: 'en',
                        notifications: true,
                        emailNotifications: true,
                        studyReminders: true,
                        soundEffects: true
                    },
                    stats: {
                        totalStudyTime: 0,
                        coursesCompleted: 0,
                        quizzesCompleted: 0,
                        averageScore: 0,
                        documentsUploaded: 0,
                        roomsJoined: 0
                    }
                };

                await setDoc(userDocRef, userDocData);

                // Initialize gamification
                await setDoc(doc(db, COLLECTIONS.GAMIFICATION, result.user.uid), {
                    xp: 0,
                    level: 1,
                    badges: [],
                    achievements: [],
                    streakDays: 0,
                    lastActiveDate: serverTimestamp(),
                    history: [],
                    milestones: []
                });
                console.log('✅ User document created');
            } else {
                console.log('📝 Updating last login time...');
                await updateDoc(userDocRef, {
                    lastLoginAt: serverTimestamp()
                });
            }

            console.log('🎉 Google login complete!');
            return result.user;
        } catch (error) {
            console.error('❌ Google auth error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Logout
    const logout = async () => {
        try {
            console.log('👋 Logging out...');
            setAuthError(null);

            // Clean up real-time listener
            if (unsubscribeUserData) {
                unsubscribeUserData();
                setUnsubscribeUserData(null);
            }

            await signOut(auth);
            setUser(null);
            setUserData(null);
            console.log('✅ Logged out successfully');
        } catch (error) {
            console.error('❌ Logout error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Send password reset email
    const resetPassword = async (email) => {
        try {
            setAuthError(null);
            await sendPasswordResetEmail(auth, email);
            console.log('✅ Password reset email sent');
        } catch (error) {
            console.error('❌ Password reset error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Update user password
    const changePassword = async (newPassword) => {
        try {
            setAuthError(null);
            if (!user) throw new Error('No user logged in');
            await updatePassword(user, newPassword);
            console.log('✅ Password changed successfully');
        } catch (error) {
            console.error('❌ Change password error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Update user email
    const changeEmail = async (newEmail) => {
        try {
            setAuthError(null);
            if (!user) throw new Error('No user logged in');

            await updateEmail(user, newEmail);

            // Update Firestore
            await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                email: newEmail,
                updatedAt: serverTimestamp()
            });

            // Send verification email
            await sendEmailVerification(user);
            console.log('✅ Email changed successfully');
        } catch (error) {
            console.error('❌ Change email error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Update user profile (ENHANCED with detailed debugging)
    const updateUserProfile = async (updates) => {
        try {
            setAuthError(null);

            if (!user) {
                console.error('❌ No user logged in');
                throw new Error('No user logged in');
            }

            console.log('=== PROFILE UPDATE START ===');
            console.log('Current user UID:', user.uid);
            console.log('Current user email:', user.email);
            console.log('Updates to apply:', JSON.stringify(updates, null, 2));
            console.log('Current userData:', JSON.stringify(userData, null, 2));

            // Step 1: Update Firebase Auth profile first
            const authUpdates = {};
            if (updates.name) authUpdates.displayName = updates.name;
            if (updates.photoURL || updates.profilePicture) {
                authUpdates.photoURL = updates.photoURL || updates.profilePicture;
            }

            if (Object.keys(authUpdates).length > 0) {
                console.log('🔐 Updating Firebase Auth profile with:', authUpdates);
                try {
                    await updateProfile(user, authUpdates);
                    console.log('✅ Firebase Auth profile updated successfully');
                } catch (authError) {
                    console.error('❌ Firebase Auth update failed:', authError);
                    throw authError;
                }
            }

            // Step 2: Prepare Firestore update
            const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
            console.log('📝 Firestore path:', `${COLLECTIONS.USERS}/${user.uid}`);

            // Check if document exists first
            try {
                const docSnap = await getDoc(userDocRef);
                console.log('Document exists?', docSnap.exists());
                if (docSnap.exists()) {
                    console.log('Current Firestore data:', docSnap.data());
                }
            } catch (checkError) {
                console.error('❌ Error checking document:', checkError);
            }

            // Build update object
            const updateData = {};

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.bio !== undefined) updateData.bio = updates.bio;
            if (updates.phone !== undefined) updateData.phone = updates.phone;
            if (updates.location !== undefined) updateData.location = updates.location;
            if (updates.role !== undefined) updateData.role = updates.role;
            if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;
            if (updates.profilePicture !== undefined) updateData.profilePicture = updates.profilePicture;

            // Handle preferences merge
            if (updates.preferences !== undefined) {
                updateData.preferences = {
                    ...(userData?.preferences || {}),
                    ...updates.preferences
                };
            }

            updateData.updatedAt = serverTimestamp();

            console.log('📝 Final update data:', JSON.stringify(updateData, null, 2));

            // Step 3: Update Firestore
            try {
                console.log('🚀 Attempting Firestore update...');
                await updateDoc(userDocRef, updateData);
                console.log('✅✅✅ Firestore update SUCCESS!');
                console.log('=== PROFILE UPDATE COMPLETE ===');
                return { success: true };
            } catch (firestoreError) {
                console.error('❌ Firestore update FAILED');
                console.error('Error code:', firestoreError.code);
                console.error('Error message:', firestoreError.message);
                console.error('Full error:', firestoreError);

                // If document doesn't exist, try creating it
                if (firestoreError.code === 'not-found') {
                    console.log('📝 Document not found, attempting to create...');
                    try {
                        await setDoc(userDocRef, {
                            uid: user.uid,
                            email: user.email,
                            ...updateData,
                            createdAt: serverTimestamp()
                        });
                        console.log('✅ Document created successfully');
                        return { success: true };
                    } catch (createError) {
                        console.error('❌ Document creation failed:', createError);
                        throw createError;
                    }
                }

                throw firestoreError;
            }
        } catch (error) {
            console.error('❌❌❌ PROFILE UPDATE ERROR');
            console.error('Error type:', error.constructor.name);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Full error object:', error);
            console.error('Error stack:', error.stack);

            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Resend email verification
    const resendVerificationEmail = async () => {
        try {
            setAuthError(null);
            if (!user) throw new Error('No user logged in');
            await sendEmailVerification(user);
            console.log('✅ Verification email sent');
        } catch (error) {
            console.error('❌ Resend verification error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Reauthenticate user
    const reauthenticate = async (password) => {
        try {
            setAuthError(null);
            if (!user || !user.email) throw new Error('No user logged in');

            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
            console.log('✅ Reauthenticated successfully');
        } catch (error) {
            console.error('❌ Reauthentication error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Delete user account
    const deleteAccount = async () => {
        try {
            setAuthError(null);
            if (!user) throw new Error('No user logged in');

            // Soft delete in Firestore
            await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                deleted: true,
                deletedAt: serverTimestamp()
            });

            // Clean up listener
            if (unsubscribeUserData) {
                unsubscribeUserData();
            }

            // Delete auth account
            await deleteUser(user);

            setUser(null);
            setUserData(null);
            console.log('✅ Account deleted successfully');
        } catch (error) {
            console.error('❌ Delete account error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Update user stats
    const updateUserStats = async (statUpdates) => {
        try {
            if (!user) throw new Error('No user logged in');

            const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
            const updateData = {};

            Object.keys(statUpdates).forEach(key => {
                updateData[`stats.${key}`] = statUpdates[key];
            });

            updateData.updatedAt = serverTimestamp();

            await updateDoc(userDocRef, updateData);
            console.log('✅ User stats updated');
        } catch (error) {
            console.error('❌ Update stats error:', error);
            throw error;
        }
    };

    // Add XP (Enhanced with level-up detection)
    const addXP = async (xpAmount, reason = 'activity') => {
        try {
            if (!user) throw new Error('No user logged in');

            const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, user.uid);
            const gamificationDoc = await getDoc(gamificationRef);

            if (gamificationDoc.exists()) {
                const currentData = gamificationDoc.data();
                const currentXP = currentData.xp || 0;
                const currentLevel = currentData.level || 1;
                const newXP = currentXP + xpAmount;
                const newLevel = Math.floor(newXP / 100) + 1;

                // Check for level up
                const leveledUp = newLevel > currentLevel;

                await updateDoc(gamificationRef, {
                    xp: newXP,
                    level: newLevel,
                    history: [
                        ...(currentData.history || []),
                        {
                            xp: xpAmount,
                            reason: reason,
                            timestamp: serverTimestamp(),
                            type: 'earned'
                        }
                    ]
                });

                // Update user document
                await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                    xp: newXP,
                    level: newLevel,
                    updatedAt: serverTimestamp()
                });

                console.log(`✅ Added ${xpAmount} XP. ${leveledUp ? '🎉 Level up!' : ''}`);

                return { newXP, newLevel, leveledUp };
            }
        } catch (error) {
            console.error('❌ Add XP error:', error);
            throw error;
        }
    };

    // Get user by ID
    const getUserById = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
            if (userDoc.exists()) {
                return userDoc.data();
            }
            return null;
        } catch (error) {
            console.error('❌ Get user by ID error:', error);
            throw error;
        }
    };

    // Search users
    const searchUsers = async (searchTerm) => {
        try {
            const usersRef = collection(db, COLLECTIONS.USERS);
            const q = query(
                usersRef,
                where('name', '>=', searchTerm),
                where('name', '<=', searchTerm + '\uf8ff')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('❌ Search users error:', error);
            throw error;
        }
    };

    // Refresh user data manually
    const refreshUserData = async () => {
        try {
            if (!user) return;
            console.log('🔄 Manually refreshing user data...');
            await fetchUserData(user.uid);
        } catch (error) {
            console.error('❌ Refresh user data error:', error);
            throw error;
        }
    };

    // Listen to auth state changes
    useEffect(() => {
        console.log('👂 Setting up auth state listener...');
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log('🔄 Auth state changed:', currentUser ? currentUser.uid : 'No user');
            setUser(currentUser);

            if (currentUser) {
                await fetchUserData(currentUser.uid);
            } else {
                // Clean up listener when user logs out
                if (unsubscribeUserData) {
                    unsubscribeUserData();
                    setUnsubscribeUserData(null);
                }
                setUserData(null);
            }
            setLoading(false);
        });

        return () => {
            unsubscribe();
            // Clean up real-time listener on unmount
            if (unsubscribeUserData) {
                unsubscribeUserData();
            }
        };
    }, [fetchUserData]);

    const value = {
        // State
        user,
        userData,
        loading,
        authError,

        // Auth methods
        signup,
        login,
        loginWithGoogle,
        logout,

        // Password management
        resetPassword,
        changePassword,

        // Profile management
        updateUserProfile,
        changeEmail,
        resendVerificationEmail,
        reauthenticate,
        deleteAccount,

        // Data methods
        fetchUserData,
        refreshUserData,
        updateUserStats,
        addXP,
        getUserById,
        searchUsers,

        // Utility
        clearError: () => setAuthError(null)
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
