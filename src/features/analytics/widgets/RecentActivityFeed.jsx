// src/features/analytics/widgets/RecentActivityFeed.jsx - ✅ SLEEK GRAY/BLACK DESIGN
import { motion } from 'framer-motion';
import { Brain, BookOpen, Layers, Clock, CheckCircle2, TrendingUp, Zap } from 'lucide-react';

const RecentActivityFeed = ({ activities }) => {
    const getActivityIcon = (type) => {
        switch (type) {
            case 'quiz': 
                return { 
                    icon: Brain, 
                    gradient: 'from-gray-800 to-gray-900',
                    bgGradient: 'from-gray-100 to-gray-50'
                };
            case 'study': 
                return { 
                    icon: BookOpen, 
                    gradient: 'from-gray-700 to-gray-800',
                    bgGradient: 'from-gray-50 to-gray-100'
                };
            case 'flashcard': 
                return { 
                    icon: Layers, 
                    gradient: 'from-gray-600 to-gray-800',
                    bgGradient: 'from-gray-100 to-gray-50'
                };
            default: 
                return { 
                    icon: CheckCircle2, 
                    gradient: 'from-gray-900 to-black',
                    bgGradient: 'from-gray-50 to-gray-100'
                };
        }
    };

    const formatTime = (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (activities.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-2xl">
                        <Clock size={28} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">
                            Recent Activity
                        </h3>
                        <p className="text-sm text-gray-700 font-semibold">
                            Your latest <span className="text-gray-900 font-black">{activities.length}</span> learning actions
                        </p>
                    </div>
                </div>

                {/* Activity Summary Badge */}
                <div className="hidden md:flex items-center gap-2">
                    <div className="px-4 py-2 bg-gray-100 rounded-xl border-2 border-gray-200">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-gray-700" strokeWidth={2.5} />
                            <span className="text-xs font-black text-gray-900">
                                {activities.filter(a => a.score >= 80).length} High Scores
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                <div className="divide-y-2 divide-gray-100">
                    {activities.map((activity, idx) => {
                        const iconConfig = getActivityIcon(activity.type);
                        const Icon = iconConfig.icon;

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                whileHover={{ x: 4, backgroundColor: 'rgba(249, 250, 251, 1)' }}
                                className="flex items-center gap-4 p-5 transition-all cursor-pointer group"
                            >
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconConfig.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon size={24} className="text-white" strokeWidth={2.5} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-base text-gray-900 truncate mb-1.5 group-hover:text-gray-700 transition-colors">
                                        {activity.title}
                                    </h4>
                                    <div className="flex items-center flex-wrap gap-2">
                                        {activity.subject && (
                                            <span className="inline-flex items-center px-2.5 py-1 bg-gray-200 rounded-lg text-xs font-bold text-gray-900">
                                                {activity.subject}
                                            </span>
                                        )}
                                        {activity.score !== undefined && (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                                                activity.score >= 80
                                                    ? 'bg-gray-900 text-white'
                                                    : activity.score >= 60
                                                    ? 'bg-gray-700 text-white'
                                                    : 'bg-gray-500 text-white'
                                            }`}>
                                                {activity.score}% Score
                                            </span>
                                        )}
                                        {activity.duration && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-900">
                                                <Zap size={12} strokeWidth={3} />
                                                {Math.round(activity.duration / 60)}m
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-semibold">
                                            <Clock size={12} strokeWidth={2.5} />
                                            {formatTime(activity.timestamp)}
                                        </span>
                                    </div>
                                </div>

                                {/* Score Badge (Large) */}
                                {activity.score !== undefined && (
                                    <div className={`hidden md:flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 ${
                                        activity.score >= 80
                                            ? 'bg-gradient-to-br from-gray-900 to-black border-gray-800'
                                            : activity.score >= 60
                                            ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600'
                                            : 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400'
                                    } shadow-lg group-hover:scale-105 transition-transform`}>
                                        <p className="text-2xl font-black text-white leading-none">
                                            {activity.score}
                                        </p>
                                        <p className="text-xs font-bold text-gray-300">
                                            %
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Stats */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: activities.length * 0.03 + 0.2 }}
                className="grid grid-cols-3 gap-4"
            >
                <div className="text-center p-4 bg-white rounded-xl border-2 border-gray-200">
                    <p className="text-2xl font-black text-gray-900">
                        {activities.length}
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-1">
                        Total Actions
                    </p>
                </div>
                <div className="text-center p-4 bg-white rounded-xl border-2 border-gray-200">
                    <p className="text-2xl font-black text-gray-900">
                        {activities.filter(a => a.type === 'quiz').length}
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-1">
                        Quizzes
                    </p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-gray-900 to-black rounded-xl border-2 border-gray-800">
                    <p className="text-2xl font-black text-white">
                        {Math.round(
                            activities
                                .filter(a => a.score !== undefined)
                                .reduce((sum, a) => sum + a.score, 0) / 
                            activities.filter(a => a.score !== undefined).length || 0
                        )}%
                    </p>
                    <p className="text-xs text-gray-300 font-bold uppercase tracking-wider mt-1">
                        Avg Score
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default RecentActivityFeed;
