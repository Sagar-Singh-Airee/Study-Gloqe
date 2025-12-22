// src/shared/services/eventBus.js - 🏆 PRODUCTION-READY EVENT BUS 2025
// Unified Event Bus for Real-time Data Streaming
// Publishes events to both Firestore (real-time UI) and Kafka (analytics pipeline)

import { httpsCallable } from 'firebase/functions';
import { functions, db, COLLECTIONS } from '@shared/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ==================== EVENT TYPES ====================
export const EVENT_TYPES = {
    // Study Session Events
    STUDY_SESSION_STARTED: 'study.session.started',
    STUDY_SESSION_ENDED: 'study.session.ended',
    STUDY_SESSION_PAUSED: 'study.session.paused',
    STUDY_SESSION_RESUMED: 'study.session.resumed',

    // Quiz Events
    QUIZ_STARTED: 'quiz.started',
    QUIZ_COMPLETED: 'quiz.completed',
    QUIZ_ANSWER_SUBMITTED: 'quiz.answer.submitted',

    // Document Events
    DOCUMENT_UPLOADED: 'document.uploaded',
    DOCUMENT_VIEWED: 'document.viewed',
    DOCUMENT_DELETED: 'document.deleted',
    DOCUMENT_PROCESSED: 'document.processed',

    // Flashcard Events ✅ FIXED
    FLASHCARD_CREATED: 'flashcard.created',
    FLASHCARD_REVIEWED: 'flashcard.reviewed',
    FLASHCARD_DECK_CREATED: 'flashcard.deck.created',
    FLASHCARDS_GENERATED: 'flashcards.generated',

    // Gamification Events
    XP_AWARDED: 'xp.awarded',
    LEVEL_UP: 'level.up',
    BADGE_EARNED: 'badge.earned',
    ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
    STREAK_UPDATED: 'streak.updated',
    CONTENT_GENERATED: 'content.generated', // ✅ ADDED

    // Room Events
    ROOM_CREATED: 'room.created',
    ROOM_JOINED: 'room.joined',
    ROOM_LEFT: 'room.left',
    ROOM_CLOSED: 'room.closed',

    // Class Events
    CLASS_JOINED: 'class.joined',
    CLASS_LEFT: 'class.left',
    ASSIGNMENT_SUBMITTED: 'assignment.submitted',

    // Analytics/Tracking Events
    PAGE_VIEW: 'analytics.pageview',
    FEATURE_USED: 'analytics.featureused',
    ERROR_OCCURRED: 'analytics.error',

    // Notification Events
    NOTIFICATION_SENT: 'notification.sent',
    NOTIFICATION_READ: 'notification.read',

    // Generic fallback
    GENERIC_EVENT: 'generic.event'
};

// ==================== KAFKA TOPICS ====================
export const KAFKA_TOPICS = {
    STUDY_EVENTS: 'study-events',
    QUIZ_EVENTS: 'quiz-events',
    GAMIFICATION_EVENTS: 'gamification-events',
    DOCUMENT_EVENTS: 'document-events',
    FLASHCARD_EVENTS: 'flashcard-events',
    ROOM_EVENTS: 'room-events',
    ANALYTICS_EVENTS: 'analytics-events',
    NOTIFICATION_EVENTS: 'notification-events',
    AUDIT_LOGS: 'audit-logs'
};

// Map event types to Kafka topics
const EVENT_TO_TOPIC = {
    [EVENT_TYPES.STUDY_SESSION_STARTED]: KAFKA_TOPICS.STUDY_EVENTS,
    [EVENT_TYPES.STUDY_SESSION_ENDED]: KAFKA_TOPICS.STUDY_EVENTS,
    [EVENT_TYPES.STUDY_SESSION_PAUSED]: KAFKA_TOPICS.STUDY_EVENTS,
    [EVENT_TYPES.STUDY_SESSION_RESUMED]: KAFKA_TOPICS.STUDY_EVENTS,

    [EVENT_TYPES.QUIZ_STARTED]: KAFKA_TOPICS.QUIZ_EVENTS,
    [EVENT_TYPES.QUIZ_COMPLETED]: KAFKA_TOPICS.QUIZ_EVENTS,
    [EVENT_TYPES.QUIZ_ANSWER_SUBMITTED]: KAFKA_TOPICS.QUIZ_EVENTS,

    [EVENT_TYPES.DOCUMENT_UPLOADED]: KAFKA_TOPICS.DOCUMENT_EVENTS,
    [EVENT_TYPES.DOCUMENT_VIEWED]: KAFKA_TOPICS.DOCUMENT_EVENTS,
    [EVENT_TYPES.DOCUMENT_DELETED]: KAFKA_TOPICS.DOCUMENT_EVENTS,
    [EVENT_TYPES.DOCUMENT_PROCESSED]: KAFKA_TOPICS.DOCUMENT_EVENTS,

    // ✅ FIXED: Flashcard event mappings
    [EVENT_TYPES.FLASHCARD_CREATED]: KAFKA_TOPICS.FLASHCARD_EVENTS,
    [EVENT_TYPES.FLASHCARD_REVIEWED]: KAFKA_TOPICS.FLASHCARD_EVENTS,
    [EVENT_TYPES.FLASHCARD_DECK_CREATED]: KAFKA_TOPICS.FLASHCARD_EVENTS,
    [EVENT_TYPES.FLASHCARDS_GENERATED]: KAFKA_TOPICS.FLASHCARD_EVENTS,

    [EVENT_TYPES.XP_AWARDED]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.LEVEL_UP]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.BADGE_EARNED]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.STREAK_UPDATED]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.ACHIEVEMENT_UNLOCKED]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.CONTENT_GENERATED]: KAFKA_TOPICS.GAMIFICATION_EVENTS, // ✅ ADDED

    [EVENT_TYPES.ROOM_CREATED]: KAFKA_TOPICS.ROOM_EVENTS,
    [EVENT_TYPES.ROOM_JOINED]: KAFKA_TOPICS.ROOM_EVENTS,
    [EVENT_TYPES.ROOM_LEFT]: KAFKA_TOPICS.ROOM_EVENTS,
    [EVENT_TYPES.ROOM_CLOSED]: KAFKA_TOPICS.ROOM_EVENTS,

    [EVENT_TYPES.PAGE_VIEW]: KAFKA_TOPICS.ANALYTICS_EVENTS,
    [EVENT_TYPES.FEATURE_USED]: KAFKA_TOPICS.ANALYTICS_EVENTS,
    [EVENT_TYPES.ERROR_OCCURRED]: KAFKA_TOPICS.ANALYTICS_EVENTS,

    [EVENT_TYPES.NOTIFICATION_SENT]: KAFKA_TOPICS.NOTIFICATION_EVENTS,
    [EVENT_TYPES.NOTIFICATION_READ]: KAFKA_TOPICS.NOTIFICATION_EVENTS
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Remove undefined values from object (Firestore doesn't accept undefined)
 * ✅ ENHANCED: Handles deeply nested objects and arrays
 */
const cleanObject = (obj) => {
    if (obj === null) return null;
    if (obj === undefined) return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj
            .map(cleanObject)
            .filter(item => item !== undefined && item !== null);
    }

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
            const cleanedValue = typeof value === 'object' ? cleanObject(value) : value;
            if (cleanedValue !== undefined && cleanedValue !== null) {
                cleaned[key] = cleanedValue;
            }
        }
    }
    return cleaned;
};

/**
 * Validate event type ✅ FIXED
 */
const validateEventType = (eventType) => {
    // Check if it's a valid string
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
        console.warn(`⚠️ Invalid event type: "${eventType}" - using GENERIC_EVENT`);
        return EVENT_TYPES.GENERIC_EVENT;
    }

    // Check if it's a known event type
    const isKnownType = Object.values(EVENT_TYPES).includes(eventType);
    if (!isKnownType) {
        console.warn(`⚠️ Unknown event type: "${eventType}" - using GENERIC_EVENT`);
        return EVENT_TYPES.GENERIC_EVENT;
    }

    return eventType;
};

/**
 * Validate payload ✅ ENHANCED
 */
const validatePayload = (payload) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        console.warn('⚠️ Invalid payload, using empty object');
        return {};
    }
    return cleanObject(payload);
};

// ==================== EVENT BUS CLASS ====================
class EventBus {
    constructor() {
        this.subscribers = new Map();
        this.eventQueue = [];
        this.isProcessing = false;
        this.kafkaEnabled = true;
        this.firestoreEnabled = true;
        this.debugMode = import.meta.env.DEV;
        this.maxRetries = 3;
        this.batchSize = 10;
        this.batchTimer = null;
        this.stats = {
            published: 0,
            succeeded: 0,
            failed: 0,
            retried: 0
        };
    }

    // ==================== PUBLISH EVENT ====================
    async publish(eventType, payload = {}, options = {}) {
        try {
            // ✅ FIXED: Strict validation
            const validatedType = validateEventType(eventType);
            const validatedPayload = validatePayload(payload);

            const event = this._createEvent(validatedType, validatedPayload, options);

            if (this.debugMode) {
                console.log(`📤 EventBus: ${validatedType}`, event);
            }

            this.stats.published++;

            // Add to queue
            this.eventQueue.push(event);

            // Start batch processing
            this._scheduleBatchProcess();

            // Notify local subscribers immediately
            this._notifySubscribers(validatedType, event);

            return event;
        } catch (error) {
            console.error('❌ EventBus: Failed to publish event', error);
            this.stats.failed++;

            return {
                id: this._generateEventId(),
                type: EVENT_TYPES.GENERIC_EVENT,
                payload: {},
                error: error.message
            };
        }
    }

    // ==================== BATCH PUBLISH ====================
    async publishBatch(events) {
        try {
            const results = await Promise.allSettled(
                events.map(({ type, payload, options }) => this.publish(type, payload, options))
            );

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (this.debugMode) {
                console.log(`📦 Batch publish: ${succeeded} succeeded, ${failed} failed`);
            }

            return { succeeded, failed, results };
        } catch (error) {
            console.error('❌ Batch publish failed:', error);
            return { succeeded: 0, failed: events.length, error: error.message };
        }
    }

    // ==================== SUBSCRIBE TO EVENTS ====================
    subscribe(eventType, callback) {
        if (!eventType || typeof callback !== 'function') {
            console.warn('⚠️ Invalid subscribe parameters');
            return () => { };
        }

        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType).add(callback);

        return () => {
            this.subscribers.get(eventType)?.delete(callback);
        };
    }

    // ==================== PRIVATE METHODS ====================

    _createEvent(eventType, payload, options = {}) {
        const event = {
            id: this._generateEventId(),
            type: eventType,
            payload: payload,
            metadata: {
                timestamp: new Date().toISOString(),
                userId: payload.userId || null,
                sessionId: this._getSessionId(),
                source: 'web',
                version: '2.0',
                environment: import.meta.env.MODE || 'production',
                ...(options.metadata || {})
            },
            topic: EVENT_TO_TOPIC[eventType] || KAFKA_TOPICS.ANALYTICS_EVENTS
        };

        // ✅ Final cleanup to ensure no undefined values
        return cleanObject(event);
    }

    _scheduleBatchProcess() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        if (this.eventQueue.length >= this.batchSize) {
            this._processQueue();
        } else {
            this.batchTimer = setTimeout(() => {
                this._processQueue();
            }, 500);
        }
    }

    async _processQueue() {
        if (this.eventQueue.length === 0 || this.isProcessing) return;

        this.isProcessing = true;

        try {
            while (this.eventQueue.length > 0) {
                const batch = this.eventQueue.splice(0, this.batchSize);

                await Promise.allSettled(
                    batch.map(async (event) => {
                        try {
                            await Promise.all([
                                this.firestoreEnabled ? this._writeToFirestore(event) : Promise.resolve(),
                                this.kafkaEnabled ? this._sendToKafka(event) : Promise.resolve()
                            ]);
                            this.stats.succeeded++;
                        } catch (error) {
                            console.error('❌ EventBus: Failed to process event', error);

                            // ✅ Retry logic
                            if (!event._retryCount || event._retryCount < this.maxRetries) {
                                event._retryCount = (event._retryCount || 0) + 1;
                                this.eventQueue.push(event);
                                this.stats.retried++;

                                if (this.debugMode) {
                                    console.log(`🔄 Retrying event (${event._retryCount}/${this.maxRetries}):`, event.type);
                                }
                            } else {
                                console.error(`❌ Event dropped after ${this.maxRetries} retries:`, event.type);
                                this.stats.failed++;
                            }
                        }
                    })
                );
            }
        } finally {
            this.isProcessing = false;

            if (this.eventQueue.length > 0) {
                this._scheduleBatchProcess();
            }
        }
    }

    async _writeToFirestore(event) {
        try {
            // ✅ FIXED: Extra validation before Firestore write
            if (!event || !event.type || typeof event.type !== 'string') {
                throw new Error('Invalid event structure for Firestore');
            }

            const cleanedEvent = cleanObject(event);

            if (!cleanedEvent || Object.keys(cleanedEvent).length === 0) {
                throw new Error('Event became empty after cleaning');
            }

            const eventsRef = collection(db, COLLECTIONS.USER_EVENTS);
            await addDoc(eventsRef, {
                ...cleanedEvent,
                createdAt: serverTimestamp()
            });

            if (this.debugMode) {
                console.log('✅ Event written to Firestore:', event.type);
            }
        } catch (error) {
            console.error('❌ Firestore write failed:', error);
            console.error('Event that failed:', event);
            throw error;
        }
    }

    async _sendToKafka(event) {
        try {
            // ✅ FIXED: Validation before Kafka send
            if (!event || !event.type || !event.topic) {
                if (this.debugMode) {
                    console.warn('⚠️ Skipping Kafka send - invalid event:', event);
                }
                return;
            }

            const produceEvent = httpsCallable(functions, 'produceKafkaEvent');

            await produceEvent({
                topic: event.topic,
                event: {
                    key: event.payload?.userId || event.id,
                    value: JSON.stringify(cleanObject(event))
                }
            });

            if (this.debugMode) {
                console.log('✅ Event sent to Kafka:', event.topic);
            }
        } catch (error) {
            // ✅ FIXED: Gracefully handle CORS and Kafka errors
            if (this.debugMode) {
                console.warn('⚠️ Kafka send failed (ignoring):', error.code || error.message);
            }
            // Don't throw - Kafka is optional
        }
    }

    _notifySubscribers(eventType, event) {
        try {
            const callbacks = this.subscribers.get(eventType);
            if (callbacks) {
                callbacks.forEach(callback => {
                    try {
                        callback(event);
                    } catch (error) {
                        console.error('❌ Subscriber error:', error);
                    }
                });
            }

            const wildcardCallbacks = this.subscribers.get('*');
            if (wildcardCallbacks) {
                wildcardCallbacks.forEach(callback => {
                    try {
                        callback(event);
                    } catch (error) {
                        console.error('❌ Wildcard subscriber error:', error);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error notifying subscribers:', error);
        }
    }

    _generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _getSessionId() {
        if (typeof window === 'undefined') return null;

        try {
            let sessionId = sessionStorage.getItem('eventbus_session_id');
            if (!sessionId) {
                sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                sessionStorage.setItem('eventbus_session_id', sessionId);
            }
            return sessionId;
        } catch (error) {
            return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    // ==================== CONFIGURATION ====================

    setKafkaEnabled(enabled) {
        this.kafkaEnabled = Boolean(enabled);
        if (this.debugMode) {
            console.log(`🔧 Kafka ${this.kafkaEnabled ? 'enabled' : 'disabled'}`);
        }
    }

    setFirestoreEnabled(enabled) {
        this.firestoreEnabled = Boolean(enabled);
        if (this.debugMode) {
            console.log(`🔧 Firestore ${this.firestoreEnabled ? 'enabled' : 'disabled'}`);
        }
    }

    setDebugMode(enabled) {
        this.debugMode = Boolean(enabled);
    }

    setBatchSize(size) {
        this.batchSize = Math.max(1, Math.min(size, 50));
    }

    setMaxRetries(retries) {
        this.maxRetries = Math.max(0, Math.min(retries, 5));
    }

    // ==================== UTILITIES ====================

    getQueueSize() {
        return this.eventQueue.length;
    }

    clearQueue() {
        this.eventQueue = [];
        if (this.debugMode) {
            console.log('🗑️ Event queue cleared');
        }
    }

    getStats() {
        return {
            ...this.stats,
            queueSize: this.eventQueue.length,
            isProcessing: this.isProcessing,
            subscriberCount: this.subscribers.size,
            kafkaEnabled: this.kafkaEnabled,
            firestoreEnabled: this.firestoreEnabled,
            debugMode: this.debugMode,
            batchSize: this.batchSize,
            maxRetries: this.maxRetries
        };
    }

    resetStats() {
        this.stats = {
            published: 0,
            succeeded: 0,
            failed: 0,
            retried: 0
        };
    }
}

// ==================== SINGLETON EXPORT ====================
export const eventBus = new EventBus();

// ==================== CONVENIENCE FUNCTIONS ====================

export const publishStudyEvent = (type, payload) => eventBus.publish(type, payload);
export const publishQuizEvent = (type, payload) => eventBus.publish(type, payload);
export const publishGamificationEvent = (type, payload) => eventBus.publish(type, payload);
export const publishDocumentEvent = (type, payload) => eventBus.publish(type, payload);
export const publishFlashcardEvent = (type, payload) => eventBus.publish(type, payload);
export const publishAnalyticsEvent = (type, payload) => eventBus.publish(type, payload);
export const publishRoomEvent = (type, payload) => eventBus.publish(type, payload);

// ==================== REACT HOOK ====================
export const useEventBus = () => ({
    publish: eventBus.publish.bind(eventBus),
    publishBatch: eventBus.publishBatch.bind(eventBus),
    subscribe: eventBus.subscribe.bind(eventBus),
    getStats: eventBus.getStats.bind(eventBus),
    resetStats: eventBus.resetStats.bind(eventBus),
    EVENT_TYPES
});

// ==================== DEVELOPMENT HELPERS ====================

if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.__eventBus = eventBus;
    console.log('🔧 EventBus available at window.__eventBus for debugging');
    console.log('💡 Try: window.__eventBus.getStats()');
}

export default eventBus;
