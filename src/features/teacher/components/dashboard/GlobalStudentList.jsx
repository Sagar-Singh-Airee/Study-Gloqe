import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Eye, Clock, Award } from 'lucide-react';
import { db } from '@shared/config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const GlobalStudentList = ({ classes = [] }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (classes.length > 0) {
            loadAllStudents();
        } else {
            setLoading(false);
        }
    }, [classes]);

    const loadAllStudents = async () => {
        try {
            setLoading(true);
            const allStudentIds = [...new Set(classes.flatMap(c => c.students || []))];

            const studentsData = await Promise.all(
                allStudentIds.map(async (id) => {
                    const userDoc = await getDoc(doc(db, 'users', id));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        // Find which classes this student belongs to
                        const studentClasses = classes.filter(c => c.students?.includes(id));
                        return { id, ...data, classes: studentClasses };
                    }
                    return null;
                })
            );

            setStudents(studentsData.filter(Boolean));
        } catch (error) {
            console.error('Error loading global students:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-black">All Students</h2>
                    <p className="text-gray-600 mt-1">Total {students.length} unique students across {classes.length} classes</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search all students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                />
            </div>

            {filteredStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStudents.map((student) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <img
                                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.name}&background=000&color=fff&bold=true`}
                                    alt={student.name}
                                    className="w-14 h-14 rounded-full border-2 border-gray-100"
                                />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-black truncate">{student.name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="text-xs font-black uppercase text-gray-400 tracking-wider">Enrolled In</div>
                                <div className="flex flex-wrap gap-2">
                                    {student.classes.map(c => (
                                        <span key={c.id} className="px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-700">
                                            {c.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                                    <Award size={14} />
                                    Level {student.level || 1}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => window.location.href = `mailto:${student.email}`}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Mail size={18} className="text-gray-600" />
                                    </button>
                                    <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:scale-105 transition-transform">
                                        View
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Users className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-black">No students matched your search</h3>
                </div>
            )}
        </div>
    );
};

export default GlobalStudentList;
