// src/pages/ClassDetails.jsx - UPDATED FOR STUDENTS

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import {
  BookOpen,
  Calendar,
  Award,
  ArrowLeft,
  Upload,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Trophy,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getClassById,
  getClassStudents
} from '@teacher/services/classService';
import {
  getClassAssignments,
  getStudentSubmission,
  submitAssignment
} from '@teacher/services/assignmentService';

const ClassDetails = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();

  const [classData, setClassData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('assignments');
  const [loading, setLoading] = useState(true);

  // Submission modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Track submissions
  const [mySubmissions, setMySubmissions] = useState({});

  useEffect(() => {
    loadClassData();
  }, [classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      const classInfo = await getClassById(classId);

      // Verify student is enrolled
      if (!classInfo.students?.includes(user.uid)) {
        toast.error('You are not enrolled in this class');
        navigate('/dashboard');
        return;
      }

      setClassData(classInfo);

      // Load assignments and students
      const [assignmentsData, studentsData] = await Promise.all([
        getClassAssignments(classId),
        getClassStudents(classId)
      ]);

      setAssignments(assignmentsData);
      setStudents(studentsData);

      // Load student's submissions for each assignment
      const submissions = {};
      for (const assignment of assignmentsData) {
        const submission = await getStudentSubmission(assignment.id, user.uid);
        if (submission) {
          submissions[assignment.id] = submission;
        }
      }
      setMySubmissions(submissions);
    } catch (error) {
      console.error('Error loading class:', error);
      toast.error('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmitModal = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionText('');
    setSubmissionFiles([]);
    setShowSubmitModal(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSubmissionFiles(files);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();

    if (!submissionText.trim() && submissionFiles.length === 0) {
      toast.error('Please provide text or upload files');
      return;
    }

    try {
      setSubmitting(true);
      await submitAssignment(selectedAssignment.id, user.uid, {
        text: submissionText,
        files: submissionFiles
      });

      setShowSubmitModal(false);
      loadClassData();
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getAssignmentStatus = (assignment) => {
    const submission = mySubmissions[assignment.id];
    const dueDate = new Date(assignment.dueDate);
    const now = new Date();

    if (submission) {
      if (submission.status === 'graded') {
        return {
          label: 'Graded',
          color: 'green',
          icon: CheckCircle
        };
      }
      return {
        label: 'Submitted',
        color: 'blue',
        icon: CheckCircle
      };
    }

    if (now > dueDate) {
      return {
        label: 'Overdue',
        color: 'red',
        icon: AlertCircle
      };
    }

    return {
      label: 'Pending',
      color: 'yellow',
      icon: Clock
    };
  };

  const calculateGrade = (submission, assignment) => {
    if (!submission || !submission.grade) return null;
    const percentage = (submission.grade / assignment.totalPoints) * 100;
    return `${submission.grade}/${assignment.totalPoints} (${percentage.toFixed(0)}%)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading class...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{classData?.name}</h1>
              <p className="text-gray-400 mt-1">{classData?.subject}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-500">
                  Class Code: <span className="font-mono text-blue-400">{classData?.classCode}</span>
                </span>
                <span className="text-sm text-gray-500">
                  {students.length} Students
                </span>
                <span className="text-sm text-gray-500">
                  {assignments.length} Assignments
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-400">Instructor</p>
              <p className="text-lg font-semibold text-white">{classData?.teacherName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === 'assignments'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
            <BookOpen className="w-5 h-5" />
            Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('classmates')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === 'classmates'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
            <Users className="w-5 h-5" />
            Classmates ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === 'grades'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
              }`}
          >
            <Trophy className="w-5 h-5" />
            My Grades
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No assignments yet</p>
              </div>
            ) : (
              assignments.map((assignment) => {
                const status = getAssignmentStatus(assignment);
                const StatusIcon = status.icon;
                const submission = mySubmissions[assignment.id];

                return (
                  <div
                    key={assignment.id}
                    className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-white">
                            {assignment.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${assignment.type === 'quiz'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-blue-500/20 text-blue-400'
                              }`}
                          >
                            {assignment.type}
                          </span>
                          <span
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-${status.color}-500/20 text-${status.color}-400`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-gray-400 mt-2">{assignment.description}</p>
                        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due: {new Date(assignment.dueDate).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            {assignment.totalPoints} points
                          </span>
                        </div>

                        {/* Show grade if graded */}
                        {submission?.status === 'graded' && (
                          <div className="mt-4 bg-gray-700 rounded-lg p-4">
                            <p className="text-sm text-gray-400">
                              Grade: <span className="text-green-400 font-bold text-lg">{calculateGrade(submission, assignment)}</span>
                            </p>
                            {submission.feedback && (
                              <p className="text-sm text-gray-300 mt-2">
                                Feedback: {submission.feedback}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {assignment.type === 'quiz' ? (
                          <button
                            onClick={() => navigate(`/quiz/${assignment.quizId}`)}
                            disabled={!!submission}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${submission
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                              }`}
                          >
                            {submission ? 'Completed' : 'Start Quiz'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSubmitModal(assignment)}
                            disabled={!!submission || new Date() > new Date(assignment.dueDate)}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${submission || new Date() > new Date(assignment.dueDate)
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                          >
                            {submission ? 'Submitted' : 'Submit'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Classmates Tab */}
        {activeTab === 'classmates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {student.name?.charAt(0)?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{student.name || 'Student'}</h4>
                    <p className="text-sm text-gray-400">Level {student.level || 1}</p>
                    <p className="text-xs text-gray-500">{student.xp || 0} XP</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grades Tab */}
        {activeTab === 'grades' && (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Grade Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-400">
                    {Object.values(mySubmissions).filter(s => s.status === 'graded').length}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Graded</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    {Object.values(mySubmissions).filter(s => s.status === 'submitted').length}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-400">
                    {assignments.length - Object.keys(mySubmissions).length}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Not Submitted</p>
                </div>
              </div>
            </div>

            {/* Graded Assignments */}
            <div className="space-y-3">
              {assignments
                .filter(a => mySubmissions[a.id]?.status === 'graded')
                .map((assignment) => {
                  const submission = mySubmissions[assignment.id];
                  return (
                    <div
                      key={assignment.id}
                      className="bg-gray-800 rounded-lg border border-gray-700 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{assignment.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">
                            Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">
                            {submission.grade}/{assignment.totalPoints}
                          </p>
                          <p className="text-sm text-gray-400">
                            {((submission.grade / assignment.totalPoints) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      {submission.feedback && (
                        <div className="mt-3 bg-gray-700 rounded-lg p-3">
                          <p className="text-sm text-gray-300">{submission.feedback}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Submit: {selectedAssignment.title}
              </h2>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Answer
                </label>
                <textarea
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={6}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Attach Files (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                    <Upload className="w-5 h-5" />
                    <span className="text-gray-300">
                      {submissionFiles.length > 0
                        ? `${submissionFiles.length} file(s) selected`
                        : 'Choose files'}
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {submissionFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {submissionFiles.map((file, idx) => (
                      <p key={idx} className="text-sm text-gray-400">
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Assignment
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetails;
