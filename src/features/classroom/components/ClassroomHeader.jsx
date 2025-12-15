// src/components/classroom/ClassroomHeader.jsx
import { Users, BookOpen, Calendar, Code, RefreshCw } from 'lucide-react';

const ClassroomHeader = ({ classData, isTeacher, onRefresh }) => {
    return (
        <div className="bg-gradient-to-br from-gray-900 to-black text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        {/* Role Badge */}
                        <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold mb-4 backdrop-blur-xl">
                            {isTeacher ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
                        </div>

                        {/* Class Info */}
                        <h1 className="text-4xl font-black mb-2">{classData.name}</h1>
                        <p className="text-xl text-gray-300 mb-6">{classData.subject}</p>

                        {/* Stats Grid */}
                        <div className="flex flex-wrap gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-xl">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <div className="text-2xl font-black">{classData.studentCount || 0}</div>
                                    <div className="text-xs text-gray-400">Students</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-xl">
                                    <BookOpen size={18} />
                                </div>
                                <div>
                                    <div className="text-2xl font-black">Section {classData.section}</div>
                                    <div className="text-xs text-gray-400">Class Section</div>
                                </div>
                            </div>

                            {classData.classCode && (
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-xl">
                                        <Code size={18} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black tracking-wider">{classData.classCode}</div>
                                        <div className="text-xs text-gray-400">Class Code</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={onRefresh}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-xl"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>

                {/* Teacher Name */}
                {!isTeacher && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="text-sm text-gray-400">Taught by</div>
                        <div className="text-lg font-bold">{classData.teacherName}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassroomHeader;
