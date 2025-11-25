import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '@config/firebase';

const AuthContext = createContext({});

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

    // Fetch user data from Firestore
    const fetchUserData = async (uid) => {
        try {
            const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    // Sign up with email and password
    const signup = async (email, password, additionalData = {}) => {
        const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

        // Create user document in Firestore
        const userDocData = {
            uid: newUser.uid,
            email: newUser.email,
            name: additionalData.name || '',
            role: additionalData.role || 'student',
            xp: 0,
            level: 1,
            createdAt: new Date().toISOString(),
            preferences: {
                theme: 'dark',
                notifications: true
            }
        };

        await setDoc(doc(db, COLLECTIONS.USERS, newUser.uid), userDocData);

        // Initialize gamification
        await setDoc(doc(db, COLLECTIONS.GAMIFICATION, newUser.uid), {
            xp: 0,
            level: 1,
            badges: [],
            history: []
        });

        return newUser;
    };

    // Login with email and password
    const login = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    };

    // Login with Google
    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        // Check if user document exists, if not create it
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, result.user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, COLLECTIONS.USERS, result.user.uid), {
                uid: result.user.uid,
                email: result.user.email,
                name: result.user.displayName || '',
                role: 'student',
                xp: 0,
                level: 1,
                createdAt: new Date().toISOString(),
                preferences: {
                    theme: 'dark',
                    notifications: true
                }
            });

            await setDoc(doc(db, COLLECTIONS.GAMIFICATION, result.user.uid), {
                xp: 0,
                level: 1,
                badges: [],
                history: []
            });
        }

        return result.user;
    };

    // Logout
    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setUserData(null);
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
    }, []);

    const value = {
        user,
        userData,
        loading,
        signup,
        login,
        loginWithGoogle,
        logout,
        fetchUserData
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;