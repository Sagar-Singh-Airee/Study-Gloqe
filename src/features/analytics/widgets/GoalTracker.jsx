// src/features/analytics/widgets/GoalTracker.jsx - ✅ SLEEK GRAY/BLACK DESIGN
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Target, Plus, X, Trash2, CheckCircle2, Circle, TrendingUp, Zap } from 'lucide-react';

const GoalTracker = ({ goals, currentStats, onUpdateGoal }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newGoal, setNewGoal] = useState({ type: 'studyTime', target: 0, period: 'weekly' });

    const goalTypes = {
        studyTime: { 
            label: 'Study Hours', 
            unit: 'hrs', 
            current: currentStats.totalStudyTime,
            icon: TrendingUp
        },
        quizzes: { 
            label: 'Quizzes', 
            unit: 'quizzes', 
            current: currentStats.totalQuizzes,
            icon: Target
        },
        accuracy: { 
            label: 'Accuracy', 
            unit: '%', 
            current: currentStats.accuracy,
            icon: Zap
        },
        streak: { 
            label: 'Streak', 
            unit: 'days', 
            current: currentStats.streak,
            icon: CheckCircle2
        }
    };

    const handleAddGoal = () => {
        if (newGoal.target > 0) {
            onUpdateGoal({
                ...newGoal,
                id: Date.now().toString(),
                createdAt: new Date(),
                completed: false
            });
            setNewGoal({ type: 'studyTime', target: 0, period: 'weekly' });
            setIsAdding(false);
        }
    };

    const calculateProgress = (goal) => {
        const config = goalTypes[goal.type];
        if (!config) return 0;
        return Math.min(Math.round((config.current / goal.target) * 100), 100);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-2xl">
                        <Target size={28} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">
                            Goal Tracker
                        </h3>
                        <p className="text-sm text-gray-700 font-semibold">
                            <span className="text-gray-900 font-black">{goals.length}</span> active goal{goals.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsAdding(!isAdding)}
                    className="px-5 py-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl font-black hover:shadow-lg transition-all flex items-center gap-2 border-2 border-gray-800"
                >
                    {isAdding ? <X size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} />}
                    {isAdding ? 'Close' : 'Add Goal'}
                </motion.button>
            </div>

            {/* Add Goal Form */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-6 p-5 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border-2 border-gray-300 shadow-inner"
                    >
                        <p className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">
                            Create New Goal
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                    Goal Type
                                </label>
                                <select
                                    value={newGoal.type}
                                    onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-bold text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                                >
                                    {Object.entries(goalTypes).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                    Target Value
                                </label>
                                <input
                                    type="number"
                                    value={newGoal.target || ''}
                                    onChange={(e) => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                                    placeholder="Enter target"
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-bold text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                                    Time Period
                                </label>
                                <select
                                    value={newGoal.period}
                                    onChange={(e) => setNewGoal({ ...newGoal, period: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-bold text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAddGoal}
                                disabled={!newGoal.target || newGoal.target <= 0}
                                className="flex-1 px-5 py-3 bg-gradient-to-r from-gray-900 to-black text-white rounded-xl font-black hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-800"
                            >
                                ✓ Save Goal
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsAdding(false)}
                                className="px-5 py-3 bg-white text-gray-900 rounded-xl font-black hover:bg-gray-100 transition-all border-2 border-gray-300"
                            >
                                Cancel
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Goals List */}
            <div className="space-y-4">
                {goals.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                            <Target size={40} className="text-gray-400" />
                        </div>
                        <p className="text-base font-bold text-gray-900 mb-1">No goals set yet</p>
                        <p className="text-sm text-gray-600 font-medium mb-4">
                            Set your first goal to track your progress
                        </p>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors inline-flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Create Your First Goal
                        </button>
                    </div>
                ) : (
                    goals.map((goal, idx) => {
                        const config = goalTypes[goal.type];
                        const progress = calculateProgress(goal);
                        const isCompleted = progress >= 100;
                        const Icon = config?.icon || Target;

                        return (
                            <motion.div
                                key={goal.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -2 }}
                                className={`p-5 rounded-xl border-2 shadow-md hover:shadow-lg transition-all ${
                                    isCompleted
                                        ? 'bg-gradient-to-br from-gray-900 to-black border-gray-800'
                                        : 'bg-white border-gray-300'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {isCompleted ? (
                                            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-lg">
                                                <CheckCircle2 size={24} className="text-white" strokeWidth={3} />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                                                <Icon size={24} className="text-gray-600" strokeWidth={2.5} />
                                            </div>
                                        )}
                                        <div>
                                            <h4 className={`font-black text-base ${isCompleted ? 'text-white' : 'text-gray-900'}`}>
                                                {config?.label || 'Goal'} - {goal.target} {config?.unit || ''}
                                            </h4>
                                            <p className={`text-xs font-semibold capitalize ${isCompleted ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {goal.period} goal
                                            </p>
                                        </div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => onUpdateGoal({ ...goal, deleted: true })}
                                        className={`p-2 rounded-lg transition-colors ${
                                            isCompleted 
                                                ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                                                : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'
                                        }`}
                                    >
                                        <Trash2 size={18} strokeWidth={2.5} />
                                    </motion.button>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className={`font-bold ${isCompleted ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {config?.current || 0} / {goal.target} {config?.unit || ''}
                                        </span>
                                        <span className={`font-black ${isCompleted ? 'text-green-400' : 'text-gray-900'}`}>
                                            {progress}%
                                        </span>
                                    </div>
                                    <div className={`h-3 rounded-full overflow-hidden ${isCompleted ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 1, delay: idx * 0.1, ease: "easeOut" }}
                                            className={`h-full ${
                                                isCompleted
                                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                    : 'bg-gradient-to-r from-gray-700 via-gray-800 to-gray-900'
                                            } shadow-lg`}
                                        />
                                    </div>
                                </div>

                                {/* Status Badge */}
                                {isCompleted && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-3 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-center"
                                    >
                                        <p className="text-xs font-black text-green-400">
                                            🎉 Goal Completed! Amazing work!
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Summary Stats */}
            {goals.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-6 pt-6 border-t-2 border-gray-200"
                >
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <p className="text-2xl font-black text-gray-900">
                                {goals.length}
                            </p>
                            <p className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-1">
                                Total
                            </p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
                            <p className="text-2xl font-black text-green-700">
                                {goals.filter(g => calculateProgress(g) >= 100).length}
                            </p>
                            <p className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-1">
                                Completed
                            </p>
                        </div>
                        <div className="text-center p-3 bg-gray-900 rounded-xl border border-gray-800">
                            <p className="text-2xl font-black text-white">
                                {Math.round(goals.reduce((sum, g) => sum + calculateProgress(g), 0) / goals.length)}%
                            </p>
                            <p className="text-xs text-gray-300 font-bold uppercase tracking-wider mt-1">
                                Avg Progress
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default GoalTracker;
