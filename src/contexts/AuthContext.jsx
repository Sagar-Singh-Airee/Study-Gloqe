// src/contexts/AuthContext.jsx
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
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '@config/firebase';


const AuthContext = createContext({});


// Custom error messages
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


    // Clear error after 5 seconds
    useEffect(() => {
        if (authError) {
            const timer = setTimeout(() => setAuthError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [authError]);


    // Fetch user data from Firestore with real-time updates
    const fetchUserData = useCallback(async (uid) => {
        try {
            const userDocRef = doc(db, COLLECTIONS.USERS, uid);
            
            // Set up real-time listener
            const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    console.error('User document does not exist');
                    setUserData(null);
                }
            }, (error) => {
                console.error('Error fetching user data:', error);
                setAuthError(getErrorMessage(error));
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error setting up user data listener:', error);
            setAuthError(getErrorMessage(error));
        }
    }, []);


    // Sign up with email and password
    const signup = async (email, password, additionalData = {}) => {
        try {
            setAuthError(null);
            setLoading(true);

            const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

            // Update Firebase Auth profile
            await updateProfile(newUser, {
                displayName: additionalData.name || ''
            });

            // Create user document in Firestore
            const userDocData = {
                uid: newUser.uid,
                email: newUser.email,
                name: additionalData.name || '',
                role: additionalData.role || 'student',
                photoURL: newUser.photoURL || null,
                xp: 0,
                level: 1,
                emailVerified: false,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                preferences: {
                    theme: 'dark',
                    notifications: true,
                    emailNotifications: true,
                    studyReminders: true
                },
                stats: {
                    totalStudyTime: 0,
                    coursesCompleted: 0,
                    quizzesCompleted: 0,
                    averageScore: 0
                }
            };

            await setDoc(doc(db, COLLECTIONS.USERS, newUser.uid), userDocData);

            // Initialize gamification
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

            // Send email verification
            await sendEmailVerification(newUser);

            return newUser;
        } catch (error) {
            console.error('Signup error:', error);
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

            const result = await signInWithEmailAndPassword(auth, email, password);

            // Update last login time
            await updateDoc(doc(db, COLLECTIONS.USERS, result.user.uid), {
                lastLoginAt: serverTimestamp()
            });

            return result.user;
        } catch (error) {
            console.error('Login error:', error);
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
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await signInWithPopup(auth, provider);

            // Check if user document exists, if not create it
            const userDocRef = doc(db, COLLECTIONS.USERS, result.user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                const userDocData = {
                    uid: result.user.uid,
                    email: result.user.email,
                    name: result.user.displayName || '',
                    photoURL: result.user.photoURL || null,
                    role: 'student',
                    xp: 0,
                    level: 1,
                    emailVerified: result.user.emailVerified,
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                    preferences: {
                        theme: 'dark',
                        notifications: true,
                        emailNotifications: true,
                        studyReminders: true
                    },
                    stats: {
                        totalStudyTime: 0,
                        coursesCompleted: 0,
                        quizzesCompleted: 0,
                        averageScore: 0
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
            } else {
                // Update last login time
                await updateDoc(userDocRef, {
                    lastLoginAt: serverTimestamp()
                });
            }

            return result.user;
        } catch (error) {
            console.error('Google auth error:', error);
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
            await signOut(auth);
            setUser(null);
            setUserData(null);
        } catch (error) {
            console.error('Logout error:', error);
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
            console.error('Password reset error:', error);
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
            console.error('Change password error:', error);
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
                email: newEmail
            });
            
            // Send verification email
            await sendEmailVerification(user);
        } catch (error) {
            console.error('Change email error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };


    // Update user profile
    const updateUserProfile = async (updates) => {
        try {
            setAuthError(null);
            if (!user) throw new Error('No user logged in');

            // Update Firebase Auth profile
            if (updates.name || updates.photoURL) {
                await updateProfile(user, {
                    ...(updates.name && { displayName: updates.name }),
                    ...(updates.photoURL && { photoURL: updates.photoURL })
                });
            }

            // Update Firestore
            const userDocRef = doc(db, COLLECTIONS.USERS, user.uid);
            const updateData = {
                ...(updates.name && { name: updates.name }),
                ...(updates.photoURL && { photoURL: updates.photoURL }),
                ...(updates.role && { role: updates.role }),
                ...(updates.preferences && { preferences: updates.preferences }),
                updatedAt: serverTimestamp()
            };

            await updateDoc(userDocRef, updateData);
        } catch (error) {
            console.error('Update profile error:', error);
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
            console.error('Resend verification error:', error);
            const errorMessage = getErrorMessage(error);
            setAuthError(errorMessage);
            throw new Error(errorMessage);
        }
    };


    // Reauthenticate user (required for sensitive operations)
    const reauthenticate = async (password) => {
        try {
            setAuthError(null);
            if (!user || !user.email) throw new Error('No user logged in');
            
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
        } catch (error) {
            console.error('Reauthentication error:', error);
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

            // Delete user data from Firestore
            // Note: Consider using Cloud Functions for complete data deletion
            await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                deleted: true,
                deletedAt: serverTimestamp()
            });

            // Delete Firebase Auth account
            await deleteUser(user);
            
            setUser(null);
            setUserData(null);
        } catch (error) {
            console.error('Delete account error:', error);
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
            await updateDoc(userDocRef, {
                [`stats.${Object.keys(statUpdates)[0]}`]: Object.values(statUpdates)[0]
            });
        } catch (error) {
            console.error('Update stats error:', error);
            throw error;
        }
    };


    // Update user XP and level
    const addXP = async (xpAmount) => {
        try {
            if (!user) throw new Error('No user logged in');
            
            const gamificationRef = doc(db, COLLECTIONS.GAMIFICATION, user.uid);
            const gamificationDoc = await getDoc(gamificationRef);
            
            if (gamificationDoc.exists()) {
                const currentData = gamificationDoc.data();
                const newXP = (currentData.xp || 0) + xpAmount;
                const newLevel = Math.floor(newXP / 100) + 1; // 100 XP per level

                await updateDoc(gamificationRef, {
                    xp: newXP,
                    level: newLevel,
                    history: [
                        ...(currentData.history || []),
                        {
                            xp: xpAmount,
                            timestamp: serverTimestamp(),
                            type: 'earned'
                        }
                    ]
                });

                // Update user document
                await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
                    xp: newXP,
                    level: newLevel
                });
            }
        } catch (error) {
            console.error('Add XP error:', error);
            throw error;
        }
    };


    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                await fetchUserData(user.uid);
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
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
        updateUserStats,
        addXP,
        
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
