// src/services/announcementService.js

import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    arrayUnion,
    onSnapshot
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import toast from 'react-hot-toast';

// ==========================================
// CREATE ANNOUNCEMENT (Teacher)
// ==========================================
export const createAnnouncement = async (announcementData) => {
    try {
        const {
            teacherId,
            classId,
            title,
            content,
            priority = 'normal', // 'low', 'normal', 'high', 'urgent'
            pinned = false,
            attachments = []
        } = announcementData;

        // Validation
        if (!teacherId || !classId || !title || !content) {
            throw new Error('Missing required fields');
        }

        const announcement = {
            teacherId,
            classId,
            title,
            content,
            priority,
            pinned,
            attachments,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'active',
            readBy: [], // Array of user IDs who have read the announcement
            readCount: 0
        };

        const docRef = await addDoc(collection(db, 'announcements'), announcement);

        // Update class with announcement reference
        const classRef = doc(db, 'classes', classId);
        await updateDoc(classRef, {
            announcements: arrayUnion(docRef.id),
            lastAnnouncementAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Announcement created:', docRef.id);
        toast.success('Announcement posted successfully!');
        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating announcement:', error);
        toast.error('Failed to create announcement');
        throw error;
    }
};

// ==========================================
// GET CLASS ANNOUNCEMENTS
// ==========================================
export const getAnnouncements = async (classId) => {
    try {
        const q = query(
            collection(db, 'announcements'),
            where('classId', '==', classId),
            where('status', '==', 'active'),
            orderBy('pinned', 'desc'),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const announcements = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            // Fetch teacher details
            const teacherRef = doc(db, 'users', data.teacherId);
            const teacherSnap = await getDoc(teacherRef);
            const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};

            announcements.push({
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || new Date(),
                teacherName: teacherData.name || teacherData.displayName || 'Unknown Teacher',
                teacherPhoto: teacherData.photoURL || null
            });
        }

        return announcements;
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return [];
    }
};

// ==========================================
// LISTEN TO ANNOUNCEMENTS (Real-time)
// ==========================================
export const listenToAnnouncements = (classId, callback) => {
    try {
        const q = query(
            collection(db, 'announcements'),
            where('classId', '==', classId),
            where('status', '==', 'active'),
            orderBy('pinned', 'desc'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const announcements = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();

                // Fetch teacher details
                const teacherRef = doc(db, 'users', data.teacherId);
                const teacherSnap = await getDoc(teacherRef);
                const teacherData = teacherSnap.exists() ? teacherSnap.data() : {};

                announcements.push({
                    id: docSnap.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                    updatedAt: data.updatedAt?.toDate?.() || new Date(),
                    teacherName: teacherData.name || teacherData.displayName || 'Unknown Teacher',
                    teacherPhoto: teacherData.photoURL || null
                });
            }

            callback(announcements);
        });

        return unsubscribe;
    } catch (error) {
        console.error('Error listening to announcements:', error);
        return () => { };
    }
};

// ==========================================
// MARK ANNOUNCEMENT AS READ (Student)
// ==========================================
export const markAnnouncementAsRead = async (announcementId, userId) => {
    try {
        const announcementRef = doc(db, 'announcements', announcementId);
        const announcementSnap = await getDoc(announcementRef);

        if (!announcementSnap.exists()) {
            throw new Error('Announcement not found');
        }

        const data = announcementSnap.data();
        const readBy = data.readBy || [];

        // Check if already read
        if (readBy.includes(userId)) {
            return; // Already marked as read
        }

        await updateDoc(announcementRef, {
            readBy: arrayUnion(userId),
            readCount: (data.readCount || 0) + 1
        });

        console.log('✅ Announcement marked as read');
    } catch (error) {
        console.error('Error marking announcement as read:', error);
        throw error;
    }
};

// ==========================================
// UPDATE ANNOUNCEMENT (Teacher)
// ==========================================
export const updateAnnouncement = async (announcementId, updates) => {
    try {
        const announcementRef = doc(db, 'announcements', announcementId);
        await updateDoc(announcementRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Announcement updated');
        toast.success('Announcement updated successfully!');
    } catch (error) {
        console.error('❌ Error updating announcement:', error);
        toast.error('Failed to update announcement');
        throw error;
    }
};

// ==========================================
// DELETE ANNOUNCEMENT (Teacher)
// ==========================================
export const deleteAnnouncement = async (announcementId, classId) => {
    try {
        const announcementRef = doc(db, 'announcements', announcementId);

        // Soft delete
        await updateDoc(announcementRef, {
            status: 'deleted',
            updatedAt: serverTimestamp()
        });

        // Remove from class announcements array
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);
        const classData = classSnap.data();
        const updatedAnnouncements = (classData.announcements || []).filter(id => id !== announcementId);

        await updateDoc(classRef, {
            announcements: updatedAnnouncements,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Announcement deleted');
        toast.success('Announcement deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting announcement:', error);
        toast.error('Failed to delete announcement');
        throw error;
    }
};

// ==========================================
// PIN/UNPIN ANNOUNCEMENT (Teacher)
// ==========================================
export const togglePinAnnouncement = async (announcementId, currentPinned) => {
    try {
        const announcementRef = doc(db, 'announcements', announcementId);
        await updateDoc(announcementRef, {
            pinned: !currentPinned,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Announcement ${!currentPinned ? 'pinned' : 'unpinned'}`);
        toast.success(`Announcement ${!currentPinned ? 'pinned' : 'unpinned'}!`);
    } catch (error) {
        console.error('Error toggling pin:', error);
        toast.error('Failed to update announcement');
        throw error;
    }
};

// ==========================================
// GET UNREAD ANNOUNCEMENTS COUNT (Student)
// ==========================================
export const getUnreadAnnouncementsCount = async (classId, userId) => {
    try {
        const q = query(
            collection(db, 'announcements'),
            where('classId', '==', classId),
            where('status', '==', 'active')
        );

        const snapshot = await getDocs(q);
        let unreadCount = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const readBy = data.readBy || [];
            if (!readBy.includes(userId)) {
                unreadCount++;
            }
        });

        return unreadCount;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};
