import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Plus, Brain,
    MoreVertical, Eye, Play, Trash2,
    BarChart, Clock, Star, Users
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@shared/config/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import toast from 'react-hot-toast';

const QuizList = ({ onCreateNew }) => {
    const { user } = useAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadQuizzes();
    }, [user]);

    const loadQuizzes = async () => {
        try {
            setLoading(true);
            const q = query(
                collection(db, 'quizzes'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            }));
            setQuizzes(data);
        } catch (error) {
            console.error('Error loading quizzes:', error);
            // Don't show toast as it might fail due to index missing initially
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this quiz?')) return;
        try {
            await deleteDoc(doc(db, 'quizzes', id));
            toast.success('Quiz deleted');
            loadQuizzes();
        } catch (error) {
            toast.error('Failed to delete quiz');
        }
    };

    const filteredQuizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <h2 className="text-2xl font-black text-black">Quizzes</h2>
                    <p className="text-gray-600 mt-1">AI-powered assessment management</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                >
                    <Plus size={18} />
                    Create New Quiz
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search by title or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-all"
                />
            </div>

            {filteredQuizzes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuizzes.map((quiz) => (
                        <motion.div
                            key={quiz.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 bg-teal-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                                    <Brain size={22} />
                                </div>
                                <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-600">
                                    {quiz.difficulty || 'Medium'}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-black mb-1 line-clamp-1">{quiz.title}</h3>
                            <p className="text-sm font-medium text-teal-600 mb-4">{quiz.subject}</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                        <Users size={12} />
                                        <span>Attempts</span>
                                    </div>
                                    <div className="text-lg font-black text-black">{quiz.stats?.attemptCount || 0}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                        <Star size={12} />
                                        <span>Avg. Score</span>
                                    </div>
                                    <div className="text-lg font-black text-black">{quiz.stats?.avgScore || 0}%</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock size={12} />
                                    {quiz.meta?.totalQuestions || quiz.questions?.length || 0} Questions
                                </span>
                                <div className="flex-1" />
                                <button
                                    onClick={() => handleDelete(quiz.id)}
                                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:scale-105 active:scale-95 transition-all">
                                    Details
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Brain className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-black">No quizzes found</h3>
                    <p className="text-gray-500">Generate your first AI quiz to get started</p>
                </div>
            )}
        </div>
    );
};

export default QuizList;
