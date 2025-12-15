// src/components/analytics/Charts.jsx - Reusable Chart Components
import React, { memo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';

// ========== CUSTOM TOOLTIP ==========
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl p-3 shadow-2xl">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ========== STUDY TIME LINE CHART ==========
export const StudyTimeChart = memo(({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl"
    >
      <h3 className="text-xl font-black text-white mb-4">Study Time Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
            label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: 'white' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="minutes" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorStudy)" 
            name="Study Time"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// ========== QUIZ PERFORMANCE BAR CHART ==========
export const QuizPerformanceChart = memo(({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl"
    >
      <h3 className="text-xl font-black text-white mb-4">Quiz Performance</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="subject" 
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
            label={{ value: 'Score %', angle: -90, position: 'insideLeft', fill: 'white' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="score" 
            fill="#10b981" 
            radius={[8, 8, 0, 0]}
            name="Score"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// ========== WEEKLY ACTIVITY LINE CHART ==========
export const WeeklyActivityChart = memo(({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl"
    >
      <h3 className="text-xl font-black text-white mb-4">Weekly Activity</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="day" 
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.6)"
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: 'white' }} />
          <Line 
            type="monotone" 
            dataKey="studyTime" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5 }}
            name="Study Time (min)"
          />
          <Line 
            type="monotone" 
            dataKey="quizzes" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ fill: '#10b981', r: 5 }}
            name="Quizzes Taken"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// ========== XP PROGRESS PIE CHART ==========
export const XPDistributionChart = memo(({ data }) => {
  if (!data || data.length === 0) return null;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl"
    >
      <h3 className="text-xl font-black text-white mb-4">XP Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// ========== SUBJECT RADAR CHART ==========
export const SubjectRadarChart = memo(({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl"
    >
      <h3 className="text-xl font-black text-white mb-4">Subject Mastery</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.2)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
          />
          <Radar 
            name="Score" 
            dataKey="score" 
            stroke="#10b981" 
            fill="#10b981" 
            fillOpacity={0.6} 
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// ========== STREAK HEATMAP (Simulated) ==========
export const StreakHeatmap = memo(({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 shadow-2xl"
    >
      <h3 className="text-xl font-black text-white mb-4">Study Streak Calendar</h3>
      <div className="grid grid-cols-7 gap-2">
        {data.map((day, idx) => (
          <div
            key={idx}
            className={`aspect-square rounded-lg transition-all cursor-pointer ${
              day.studied 
                ? 'bg-green-500 hover:bg-green-400' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title={`${day.date}: ${day.studied ? 'Studied' : 'No activity'}`}
          />
        ))}
      </div>
    </motion.div>
  );
});
