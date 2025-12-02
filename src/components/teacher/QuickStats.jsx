// src/components/teacher/QuickStats.jsx
import { motion } from 'framer-motion';
import { 
    Users, BookOpen, TrendingUp, Inbox, Target, 
    ArrowUpRight, AlertCircle, CheckCircle2, Clock,
    Activity, Zap, Award, TrendingDown
} from 'lucide-react';

const QuickStats = ({ stats = {} }) => {
    const {
        totalStudents = 0,
        totalClasses = 0,
        avgProgress = 0,
        pendingReviews = 0,
        weeklyGrowth = 0,
        activeStudentsToday = 0,
        submissionsToday = 0,
        upcomingDeadlines = 0
    } = stats;

    const statCards = [
        {
            title: 'Total Students',
            value: totalStudents,
            icon: Users,
            gradient: 'from-black via-gray-900 to-black',
            iconBg: 'bg-white/10',
            badge: weeklyGrowth > 0 ? `+${weeklyGrowth}%` : null,
            badgeColor: 'bg-green-500/20 text-green-400',
            trend: 'up'
        },
        {
            title: 'Active Classes',
            value: totalClasses,
            icon: BookOpen,
            gradient: 'from-white to-white',
            iconBg: 'bg-black',
            iconColor: 'text-white',
            textColor: 'text-black',
            border: 'border-2 border-black',
            badge: activeStudentsToday > 0 ? `${activeStudentsToday} active` : null,
            badgeColor: 'bg-blue-500/20 text-blue-600',
            trend: 'up'
        },
        {
            title: 'Class Average',
            value: `${avgProgress}%`,
            icon: TrendingUp,
            gradient: 'from-gray-50 to-gray-100',
            iconBg: 'bg-black',
            iconColor: 'text-white',
            textColor: 'text-black',
            border: 'border border-gray-200',
            badge: avgProgress >= 75 ? 'Excellent' : avgProgress >= 60 ? 'Good' : 'Needs improvement',
            badgeColor: avgProgress >= 75 ? 'bg-green-500/20 text-green-600' : avgProgress >= 60 ? 'bg-yellow-500/20 text-yellow-600' : 'bg-red-500/20 text-red-600',
            trend: avgProgress >= 75 ? 'up' : 'stable'
        },
        {
            title: 'Pending Reviews',
            value: pendingReviews,
            icon: Inbox,
            gradient: pendingReviews > 0 ? 'from-orange-500 via-red-500 to-red-600' : 'from-gray-700 via-gray-800 to-black',
            iconBg: 'bg-white/10',
            badge: pendingReviews > 0 ? 'Action needed' : 'All clear',
            badgeColor: pendingReviews > 0 ? 'bg-white/20 text-white' : 'bg-green-500/20 text-green-300',
            alert: pendingReviews > 5,
            trend: pendingReviews > 0 ? 'alert' : 'stable'
        }
    ];

    const miniStats = [
        {
            label: 'Submissions Today',
            value: submissionsToday,
            icon: CheckCircle2,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            label: 'Upcoming Deadlines',
            value: upcomingDeadlines,
            icon: Clock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
        },
        {
            label: 'Active Now',
            value: activeStudentsToday,
            icon: Activity,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            label: 'Engagement Rate',
            value: `${Math.min(Math.round((activeStudentsToday / Math.max(totalStudents, 1)) * 100), 100)}%`,
            icon: Zap,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`group bg-gradient-to-br ${stat.gradient} rounded-2xl p-6 ${stat.textColor || 'text-white'} relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300 ${stat.border || ''}`}
                    >
                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Decorative Circle */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                        
                        <div className="relative">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center backdrop-blur-xl group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                                    <stat.icon size={24} className={stat.iconColor || ''} />
                                </div>
                                {stat.badge && (
                                    <span className={`text-xs ${stat.badgeColor} px-2.5 py-1 rounded-full font-bold backdrop-blur-xl`}>
                                        {stat.badge}
                                    </span>
                                )}
                                {stat.alert && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                    >
                                        <AlertCircle size={18} className="text-white" />
                                    </motion.div>
                                )}
                            </div>

                            {/* Value */}
                            <div className="text-4xl font-black mb-2">{stat.value}</div>
                            
                            {/* Title */}
                            <div className={`text-sm font-medium ${stat.textColor === 'text-black' ? 'text-gray-600' : 'text-gray-400'}`}>
                                {stat.title}
                            </div>

                            {/* Trend Indicator */}
                            {stat.trend === 'up' && (
                                <div className="absolute bottom-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <ArrowUpRight size={32} className={stat.iconColor || 'text-white'} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Mini Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {miniStats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + idx * 0.05 }}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:border-black hover:shadow-lg transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                                <stat.icon size={18} className={stat.color} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-black">{stat.value}</div>
                                <div className="text-xs text-gray-600 font-medium">{stat.label}</div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Performance Indicator */}
            {avgProgress > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                <Target size={20} className="text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-black">Overall Performance</div>
                                <div className="text-xs text-gray-500">Based on all class activities</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-black">{avgProgress}%</div>
                            {avgProgress >= 75 && (
                                <div className="flex items-center gap-1 text-xs text-green-600 font-bold">
                                    <TrendingUp size={12} />
                                    <span>Excellent</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${avgProgress}%` }}
                            transition={{ duration: 1, delay: 0.8 }}
                            className={`absolute inset-y-0 left-0 rounded-full ${
                                avgProgress >= 90 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                avgProgress >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                avgProgress >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                'bg-gradient-to-r from-red-500 to-red-600'
                            }`}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default QuickStats;
