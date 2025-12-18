// src/features/analytics/charts/ActivityHeatmap.jsx - ✅ SLEEK GRAY/BLACK DESIGN
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Activity } from 'lucide-react';

const ActivityHeatmap = ({ sessions, timeRange }) => {
    // Generate last N days
    const heatmapData = useMemo(() => {
        const days = [];
        const today = new Date();
        const daysToShow = Math.min(timeRange, 90); // Max 90 days

        // Count sessions per day
        const sessionsByDate = {};
        sessions.forEach(session => {
            const date = (session.startTime || session.createdAt).toDateString();
            sessionsByDate[date] = (sessionsByDate[date] || 0) + (session.totalTime || 30);
        });

        // Generate grid (13 weeks = 91 days)
        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const minutes = sessionsByDate[dateStr] || 0;

            days.push({
                date: dateStr,
                dayOfWeek: date.getDay(),
                minutes,
                intensity: minutes === 0 ? 0 : 
                           minutes < 30 ? 1 : 
                           minutes < 60 ? 2 : 
                           minutes < 120 ? 3 : 4
            });
        }

        return days;
    }, [sessions, timeRange]);

    // Group by weeks
    const weeks = useMemo(() => {
        const weekGroups = [];
        let currentWeek = [];

        heatmapData.forEach((day, idx) => {
            currentWeek.push(day);
            if (day.dayOfWeek === 6 || idx === heatmapData.length - 1) {
                weekGroups.push([...currentWeek]);
                currentWeek = [];
            }
        });

        return weekGroups;
    }, [heatmapData]);

    // ✅ GRAY/BLACK COLOR SCHEME
    const getColor = (intensity) => {
        switch (intensity) {
            case 0: return 'bg-gray-100 border border-gray-200';
            case 1: return 'bg-gray-300 border border-gray-400';
            case 2: return 'bg-gray-500 border border-gray-600';
            case 3: return 'bg-gray-700 border border-gray-800';
            case 4: return 'bg-gray-900 border border-black';
            default: return 'bg-gray-100 border border-gray-200';
        }
    };

    const totalActiveDays = heatmapData.filter(d => d.minutes > 0).length;
    const totalMinutes = heatmapData.reduce((sum, d) => sum + d.minutes, 0);
    const avgMinutesPerDay = Math.round(totalMinutes / heatmapData.length);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center shadow-2xl">
                        <Activity size={28} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 mb-1">
                            Activity Calendar
                        </h3>
                        <p className="text-sm text-gray-700 font-semibold">
                            <span className="text-gray-900 font-black">{totalActiveDays}</span> active days • 
                            <span className="text-gray-900 font-black ml-1">{avgMinutesPerDay}</span> min/day avg
                        </p>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2.5 px-4 py-2 bg-gray-100 rounded-xl border border-gray-300">
                    <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">Less</span>
                    {[0, 1, 2, 3, 4].map(i => (
                        <div 
                            key={i} 
                            className={`w-5 h-5 rounded-md ${getColor(i)} shadow-sm`} 
                        />
                    ))}
                    <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">More</span>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto pb-3 bg-white rounded-xl p-4 border border-gray-200">
                <div className="inline-flex gap-1.5">
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1.5">
                            {/* Pad start of first week */}
                            {weekIdx === 0 && week[0].dayOfWeek > 0 && (
                                Array.from({ length: week[0].dayOfWeek }).map((_, i) => (
                                    <div key={`pad-${i}`} className="w-4 h-4" />
                                ))
                            )}
                            {week.map((day, dayIdx) => (
                                <motion.div
                                    key={`${weekIdx}-${dayIdx}`}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ 
                                        delay: (weekIdx * 7 + dayIdx) * 0.003,
                                        type: "spring",
                                        stiffness: 200
                                    }}
                                    whileHover={{ scale: 1.5, zIndex: 10 }}
                                    className={`w-4 h-4 rounded-md ${getColor(day.intensity)} cursor-pointer group relative transition-all duration-200 hover:shadow-lg`}
                                    title={`${day.date}: ${day.minutes} minutes`}
                                >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 bg-gray-900 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-2xl border border-gray-700">
                                        <div className="font-black text-sm mb-1">
                                            {new Date(day.date).toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </div>
                                        <div className="font-semibold text-gray-300">
                                            {day.minutes > 0 ? `${day.minutes} minutes studied` : 'No activity'}
                                        </div>
                                        {/* Tooltip arrow */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Day labels */}
            <div className="flex justify-between mt-4 px-1 text-xs text-gray-600 font-bold uppercase tracking-wider">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
                <span>Sun</span>
            </div>

            {/* Stats Footer */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t-2 border-gray-200">
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-2xl font-black text-gray-900">
                        {totalActiveDays}
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-1">
                        Active Days
                    </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-2xl font-black text-gray-900">
                        {Math.round(totalMinutes / 60)}h
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-1">
                        Total Time
                    </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-2xl font-black text-gray-900">
                        {avgMinutesPerDay}m
                    </p>
                    <p className="text-xs text-gray-700 font-bold uppercase tracking-wider mt-1">
                        Daily Avg
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default ActivityHeatmap;
