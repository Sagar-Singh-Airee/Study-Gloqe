// src/services/materialService.js

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
    arrayUnion
} from 'firebase/firestore';
import { db, storage } from '@shared/config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';

// ==========================================
// UPLOAD MATERIAL (Teacher)
// ==========================================
export const uploadMaterial = async (classId, file, metadata = {}) => {
    try {
        const { title, description, type = 'document', teacherId, teacherName } = metadata;

        // Validate file
        if (!file) {
            throw new Error('No file provided');
        }

        // Upload file to Firebase Storage
        const storageRef = ref(storage, `materials/${classId}/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        // Create material document in Firestore
        const materialData = {
            classId,
            teacherId,
            teacherName: teacherName || 'Unknown Teacher',
            title: title || file.name,
            description: description || '',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileUrl: downloadURL,
            storagePath: uploadResult.ref.fullPath,
            type, // 'document', 'video', 'link', 'presentation'
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            downloadCount: 0,
            status: 'active'
        };

        const docRef = await addDoc(collection(db, 'materials'), materialData);

        // Update class with material reference
        const classRef = doc(db, 'classes', classId);
        await updateDoc(classRef, {
            materials: arrayUnion(docRef.id),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Material uploaded:', docRef.id);
        toast.success('Material uploaded successfully!');
        return docRef.id;
    } catch (error) {
        console.error('❌ Error uploading material:', error);
        toast.error('Failed to upload material');
        throw error;
    }
};

// ==========================================
// GET CLASS MATERIALS
// ==========================================
export const getMaterials = async (classId) => {
    try {
        const q = query(
            collection(db, 'materials'),
            where('classId', '==', classId),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const materials = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        }));

        return materials;
    } catch (error) {
        console.error('Error fetching materials:', error);
        return [];
    }
};

// ==========================================
// GET SINGLE MATERIAL
// ==========================================
export const getMaterial = async (materialId) => {
    try {
        const docRef = doc(db, 'materials', materialId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error('Material not found');
        }

        // Increment download count
        await updateDoc(docRef, {
            downloadCount: (docSnap.data().downloadCount || 0) + 1
        });

        return {
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate?.() || new Date()
        };
    } catch (error) {
        console.error('Error fetching material:', error);
        throw error;
    }
};

// ==========================================
// UPDATE MATERIAL
// ==========================================
export const updateMaterial = async (materialId, updates) => {
    try {
        const materialRef = doc(db, 'materials', materialId);
        await updateDoc(materialRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Material updated');
        toast.success('Material updated successfully!');
    } catch (error) {
        console.error('❌ Error updating material:', error);
        toast.error('Failed to update material');
        throw error;
    }
};

// ==========================================
// DELETE MATERIAL (Soft delete)
// ==========================================
export const deleteMaterial = async (materialId, classId) => {
    try {
        const materialRef = doc(db, 'materials', materialId);
        const materialSnap = await getDoc(materialRef);

        if (!materialSnap.exists()) {
            throw new Error('Material not found');
        }

        const materialData = materialSnap.data();

        // Delete file from Storage
        if (materialData.storagePath) {
            const fileRef = ref(storage, materialData.storagePath);
            await deleteObject(fileRef);
        }

        // Soft delete in Firestore
        await updateDoc(materialRef, {
            status: 'deleted',
            updatedAt: serverTimestamp()
        });

        // Remove from class materials array
        const classRef = doc(db, 'classes', classId);
        const classSnap = await getDoc(classRef);
        const classData = classSnap.data();
        const updatedMaterials = (classData.materials || []).filter(id => id !== materialId);

        await updateDoc(classRef, {
            materials: updatedMaterials,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Material deleted');
        toast.success('Material deleted successfully!');
    } catch (error) {
        console.error('❌ Error deleting material:', error);
        toast.error('Failed to delete material');
        throw error;
    }
};

// ==========================================
// ADD EXTERNAL LINK AS MATERIAL
// ==========================================
export const addLinkMaterial = async (classId, linkData) => {
    try {
        const { url, title, description, teacherId, teacherName } = linkData;

        if (!url) {
            throw new Error('URL is required');
        }

        const materialData = {
            classId,
            teacherId,
            teacherName: teacherName || 'Unknown Teacher',
            title: title || 'External Link',
            description: description || '',
            fileUrl: url,
            type: 'link',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            downloadCount: 0,
            status: 'active'
        };

        const docRef = await addDoc(collection(db, 'materials'), materialData);

        // Update class with material reference
        const classRef = doc(db, 'classes', classId);
        await updateDoc(classRef, {
            materials: arrayUnion(docRef.id),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Link material added:', docRef.id);
        toast.success('Link added successfully!');
        return docRef.id;
    } catch (error) {
        console.error('❌ Error adding link:', error);
        toast.error('Failed to add link');
        throw error;
    }
};
