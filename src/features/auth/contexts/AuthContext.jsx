// src/features/auth/contexts/AuthContext.jsx - FIXED (No Infinite Loops)
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { auth, db, COLLECTIONS } from '@shared/config/firebase';


const AuthContext = createContext({});

// Enhanced error messages
const getErrorMessage = (error) => {
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

    // ✅ Use ref instead of state to avoid re-renders
    const unsubscribeUserDataRef = useRef(null);

    // Clear error after 5 seconds
    useEffect(() => {
        if (authError) {
            const timer = setTimeout(() => setAuthError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [authError]);

    // ✅ FIXED: Fetch user data without circular dependencies
    const fetchUserData = useCallback((uid) => {
        if (!uid) return;

        // Clean up previous listener
        if (unsubscribeUserDataRef.current) {
            unsubscribeUserDataRef.current();
        }

        const userDocRef = doc(db, COLLECTIONS.USERS, uid);

        // Set up real-time listener
        const unsubscribe = onSnapshot(
            userDocRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    console.error('User document does not exist');
                    setUserData(null);
                }
            },
            (error) => {
                console.error('Error in real-time listener:', error);
                setAuthError(getErrorMessage(error));
            }
        );

        unsubscribeUserDataRef.current = unsubscribe;
    }, []); // ✅ No dependencies - stable function

    // Sign up with email and password
    const signup = async (email, password, additionalData = {}) => {
        try {
            setAuthError(null);
            setLoading(true);

            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

            await updateProfile(newUser, {
                displayName: additionalData.name || '',
                photoURL: additionalData.photoURL || null
            });

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

            await setDoc(doc(db, COLLECTIONS.USERS, newUser.uid), userDocData);

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

            await sendEmailVerification(newUser);

            return newUser;
        } catch (error) {
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
            setAuthError(null);
            setLoading(true);

            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            const result = await signInWithEmailAndPassword(auth, email, password);

            await updateDoc(doc(db, COLLECTIONS.USERS, result.user.uid), {
                lastLoginAt: serverTimestamp()
            });

            return result.user;
        } catch (error) {
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
            setAuthError(null);
            setLoading(true);

            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await signInWithPopup(auth, provider);

            const userDocRef = doc(db, COLLECTIONS.USERS, result.user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
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
            } else {
                await updateDoc(userDocRef, {
                    lastLoginAt: serverTimestamp()
                });
            }

            return result.user;
        } catch (error) {
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
            setAuthError(null);

            if (unsubscribeUserDataRef.current) {
                unsubscribeUserDataRef.current();
                unsubscribeUserDataRef.current = null;
            }

            await signOut(auth);
            setUser(null);
            setUserData(null);
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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

            await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                email: newEmail,
                updatedAt: serverTimestamp()
            });

            await sendEmailVerification(user);
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Update user profile
    const updateUserProfile = async (updates) => {
        try {
            setAuthError(null);

            if (!user) {
                throw new Error('No user logged in');
            }

            // Update Firebase Auth profile
            const authUpdates = {};
            if (updates.name) authUpdates.displayName = updates.name;
            if (updates.photoURL || updates.profilePicture) {
                authUpdates.photoURL = updates.photoURL || updates.profilePicture;
            }

            if (Object.keys(authUpdates).length > 0) {
                await updateProfile(user, authUpdates);
            }

            // Prepare Firestore update
            const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
            const updateData = {};

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.bio !== undefined) updateData.bio = updates.bio;
            if (updates.phone !== undefined) updateData.phone = updates.phone;
            if (updates.location !== undefined) updateData.location = updates.location;
            if (updates.role !== undefined) updateData.role = updates.role;
            if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;
            if (updates.profilePicture !== undefined) updateData.profilePicture = updates.profilePicture;

            if (updates.preferences !== undefined) {
                updateData.preferences = {
                    ...(userData?.preferences || {}),
                    ...updates.preferences
                };
            }

            updateData.updatedAt = serverTimestamp();

            try {
                await updateDoc(userDocRef, updateData);
                return { success: true };
            } catch (firestoreError) {
                if (firestoreError.code === 'not-found') {
                    await setDoc(userDocRef, {
                        uid: user.uid,
                        email: user.email,
                        ...updateData,
                        createdAt: serverTimestamp()
                    });
                    return { success: true };
                }
                throw firestoreError;
            }
        } catch (error) {
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
        } catch (error) {
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
        } catch (error) {
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

            await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                deleted: true,
                deletedAt: serverTimestamp()
            });

            if (unsubscribeUserDataRef.current) {
                unsubscribeUserDataRef.current();
            }

            await deleteUser(user);

            setUser(null);
            setUserData(null);
        } catch (error) {
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
        } catch (error) {
            console.error('Update stats error:', error);
            throw error;
        }
    };

    // Add XP
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

                await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                    xp: newXP,
                    level: newLevel,
                    updatedAt: serverTimestamp()
                });

                return { newXP, newLevel, leveledUp };
            }
        } catch (error) {
            console.error('Add XP error:', error);
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
            console.error('Get user by ID error:', error);
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
            console.error('Search users error:', error);
            throw error;
        }
    };

    // Refresh user data manually
    const refreshUserData = useCallback(() => {
        if (user) {
            fetchUserData(user.uid);
        }
    }, [user, fetchUserData]);

    // ✅ FIXED: Listen to auth state changes ONCE
    useEffect(() => {
        console.log('🔐 Setting up auth state listener (ONE TIME)');

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log('📧 Auth state changed:', currentUser?.uid || 'logged out');
            setUser(currentUser);

            if (currentUser) {
                fetchUserData(currentUser.uid);
            } else {
                if (unsubscribeUserDataRef.current) {
                    unsubscribeUserDataRef.current();
                    unsubscribeUserDataRef.current = null;
                }
                setUserData(null);
            }
            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (unsubscribeUserDataRef.current) {
                unsubscribeUserDataRef.current();
            }
        };
    }, [fetchUserData]); // ✅ fetchUserData is stable (no dependencies)

    const value = {
        user,
        userData,
        loading,
        authError,
        signup,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        changePassword,
        updateUserProfile,
        changeEmail,
        resendVerificationEmail,
        reauthenticate,
        deleteAccount,
        fetchUserData: refreshUserData,
        refreshUserData,
        updateUserStats,
        addXP,
        getUserById,
        searchUsers,
        clearError: () => setAuthError(null)
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
