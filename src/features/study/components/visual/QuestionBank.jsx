// src/features/study/components/visual/QuestionBank.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const QuestionBank = ({ questions, onSaveToQuiz }) => {
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [userAnswers, setUserAnswers] = useState({});

    const handleAnswerSelect = (questionIndex, answer) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: answer
        }));
    };

    const checkAnswer = (questionIndex) => {
        const question = questions[questionIndex];
        const userAnswer = userAnswers[questionIndex];

        if (question.type === 'mcq') {
            return userAnswer === question.correctAnswer;
        }
        return false;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Question Bank</h3>
                {onSaveToQuiz && (
                    <button
                        onClick={() => onSaveToQuiz(questions)}
                        className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 transition-colors"
                    >
                        Save to Quiz
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {questions?.map((q, index) => (
                    <div
                        key={index}
                        className="border border-slate-200 rounded-2xl overflow-hidden"
                    >
                        <button
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                            className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-sm">
                                    {index + 1}
                                </span>
                                <span className="font-semibold text-slate-900">{q.question}</span>
                            </div>
                            {expandedIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>

                        <AnimatePresence>
                            {expandedIndex === index && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-slate-200"
                                >
                                    <div className="p-4 bg-slate-50">
                                        {q.type === 'mcq' && (
                                            <div className="space-y-2">
                                                {q.options.map((option, optIndex) => (
                                                    <button
                                                        key={optIndex}
                                                        onClick={() => handleAnswerSelect(index, option)}
                                                        className={`w-full p-3 rounded-xl text-left transition-all ${userAnswers[index] === option
                                                                ? checkAnswer(index)
                                                                    ? 'bg-green-100 border-2 border-green-500'
                                                                    : 'bg-red-100 border-2 border-red-500'
                                                                : 'bg-white border border-slate-200 hover:border-teal-400'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span>{option}</span>
                                                            {userAnswers[index] === option && (
                                                                checkAnswer(index) ? (
                                                                    <CheckCircle size={18} className="text-green-600" />
                                                                ) : (
                                                                    <XCircle size={18} className="text-red-600" />
                                                                )
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}

                                                {userAnswers[index] && (
                                                    <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                                                        <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                                                        <p className="text-sm text-blue-800">{q.explanation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {q.type === 'short' && (
                                            <div>
                                                <textarea
                                                    placeholder="Type your answer..."
                                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                                                    rows={3}
                                                />
                                                <div className="mt-3 p-3 bg-green-50 rounded-xl">
                                                    <p className="text-sm font-semibold text-green-900 mb-1">Expected Answer:</p>
                                                    <p className="text-sm text-green-800">{q.answer}</p>
                                                    {q.keyPoints && (
                                                        <div className="mt-2">
                                                            <p className="text-xs font-semibold text-green-900 mb-1">Key Points:</p>
                                                            <ul className="text-xs text-green-800 list-disc list-inside">
                                                                {q.keyPoints.map((point, i) => (
                                                                    <li key={i}>{point}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default QuestionBank;
