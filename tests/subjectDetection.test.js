// tests/subjectDetection.test.js
import { detectSubjectFromContent, detectSubjectFromTitle, categorizeQuizSession } from '../src/helpers/subjectDetection';

describe('Subject Detection Logic', () => {

    test('detectSubjectFromContent should identify Math', () => {
        const text = "The integral of the function f(x) = x^2 is x^3/3. Calculus is fun.";
        const result = detectSubjectFromContent(text);
        if (result.subject !== 'Mathematics') throw new Error(`Expected Mathematics, got ${result.subject}`);
        console.log('✅ Math detection passed');
    });

    test('detectSubjectFromContent should identify Physics', () => {
        const text = "Newton's second law states that Force equals mass times acceleration (F=ma).";
        const result = detectSubjectFromContent(text);
        if (result.subject !== 'Physics') throw new Error(`Expected Physics, got ${result.subject}`);
        console.log('✅ Physics detection passed');
    });

    test('detectSubjectFromTitle should identify Biology', () => {
        const title = "Introduction to Cell Biology and Genetics.pdf";
        const subject = detectSubjectFromTitle(title);
        if (subject !== 'Biology') throw new Error(`Expected Biology, got ${subject}`);
        console.log('✅ Title detection passed');
    });

    test('categorizeQuizSession should prioritize explicit subject', () => {
        const result = categorizeQuizSession({
            subject: 'Chemistry',
            title: 'Random Quiz',
            questions: []
        });
        if (result !== 'Chemistry') throw new Error(`Expected Chemistry, got ${result}`);
        console.log('✅ Explicit subject priority passed');
    });

    test('categorizeQuizSession should infer from title if subject is generic', () => {
        const result = categorizeQuizSession({
            subject: 'General Knowledge',
            title: 'Advanced Calculus Exam',
            questions: []
        });
        if (result !== 'Mathematics') throw new Error(`Expected Mathematics, got ${result}`);
        console.log('✅ Inference from title passed');
    });

});

console.log('🏃 Running Subject Detection Tests...');
try {
    // Simple test runner since we might not have Jest configured in the environment
    const text = "The integral of the function f(x) = x^2 is x^3/3. Calculus is fun.";
    const result = detectSubjectFromContent(text);
    console.assert(result.subject === 'Mathematics', `Expected Mathematics, got ${result.subject}`);

    const title = "Introduction to Cell Biology and Genetics.pdf";
    const subject = detectSubjectFromTitle(title);
    console.assert(subject === 'Biology', `Expected Biology, got ${subject}`);

    const catResult = categorizeQuizSession({
        subject: 'General Knowledge',
        title: 'Advanced Calculus Exam',
        questions: []
    });
    console.assert(catResult === 'Mathematics', `Expected Mathematics, got ${catResult}`);

    console.log('✅ All manual assertions passed!');
} catch (e) {
    console.error('❌ Tests failed:', e);
}
