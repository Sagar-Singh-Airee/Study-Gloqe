import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { joinClassByCode, leaveClass as leaveClassService } from '@/services/classService';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

const ClassContext = createContext();

export const useClasses = () => useContext(ClassContext);

export const ClassProvider = ({ children }) => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    // Check if component is mounted to prevent state updates after unmount
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        // If no user, reset state
        if (!user?.uid) {
            setClasses([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        // Real-time listener for student classes
        const q = query(
            collection(db, 'classes'),
            where('students', 'array-contains', user.uid),
            where('active', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                if (!isMounted.current) return;

                const classesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate()
                }));

                setClasses(classesData);
                setLoading(false);
                setIsLoaded(true);
            },
            (error) => {
                console.error("Error listening to classes:", error);
                if (isMounted.current) {
                    toast.error("Could not load classes");
                    setLoading(false);
                }
            }
        );

        // Cleanup listener on unmount or user change
        return () => unsubscribe();
    }, [user?.uid]);

    // Wrapper for joining a class
    const joinClass = async (code) => {
        // The listener will automatically update the UI
        return await joinClassByCode(user.uid, code);
    };

    // Wrapper for leaving a class
    const leaveClass = async (classId) => {
        // The listener will automatically update the UI
        await leaveClassService(user.uid, classId);
    };

    const value = {
        classes,
        loading,
        isLoaded,
        joinClass,
        leaveClass
    };

    return (
        <ClassContext.Provider value={value}>
            {children}
        </ClassContext.Provider>
    );
};
