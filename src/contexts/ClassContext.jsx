import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { getUserClasses, joinClassByCode, leaveClass as leaveClassService } from '@/services/classService';
import toast from 'react-hot-toast';

const ClassContext = createContext();

export const useClasses = () => useContext(ClassContext);

export const ClassProvider = ({ children }) => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // This flag ensures we don't show a loading spinner if we already have data
    const [isLoaded, setIsLoaded] = useState(false); 

    const refreshClasses = useCallback(async (silent = false) => {
        if (!user?.uid) return;
        
        // Only show full loading spinner if it's the very first load
        if (!silent && !isLoaded) setLoading(true);
        
        try {
            const data = await getUserClasses(user.uid, 'student');
            setClasses(data);
            setIsLoaded(true);
        } catch (error) {
            console.error("Error fetching classes:", error);
            toast.error("Could not load classes");
        } finally {
            setLoading(false);
        }
    }, [user?.uid, isLoaded]);

    // Automatically load classes when the user logs in
    useEffect(() => {
        if (user?.uid && !isLoaded) {
            refreshClasses();
        }
    }, [user?.uid, isLoaded, refreshClasses]);

    // Wrapper for joining a class
    const joinClass = async (code) => {
        const result = await joinClassByCode(user.uid, code);
        // Silently refresh the list so the new class appears immediately
        await refreshClasses(true); 
        return result;
    };

    // Wrapper for leaving a class
    const leaveClass = async (classId) => {
        await leaveClassService(user.uid, classId);
        // Optimistic update: Remove it from the UI immediately without waiting for a refetch
        setClasses(prev => prev.filter(c => c.id !== classId)); 
    };

    const value = {
        classes,
        loading,
        isLoaded,
        joinClass,
        leaveClass,
        refreshClasses
    };

    return (
        <ClassContext.Provider value={value}>
            {children}
        </ClassContext.Provider>
    );
};
