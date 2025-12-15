// src/shared/services/eventBus.js
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

    // Gamification Events
    XP_AWARDED: 'xp.awarded',
    LEVEL_UP: 'level.up',
    BADGE_EARNED: 'badge.earned',
    ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',
    STREAK_UPDATED: 'streak.updated',

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
    PAGE_VIEW: 'analytics.page_view',
    FEATURE_USED: 'analytics.feature_used',
    ERROR_OCCURRED: 'analytics.error',

    // Notification Events
    NOTIFICATION_SENT: 'notification.sent',
    NOTIFICATION_READ: 'notification.read'
};

// ==================== KAFKA TOPICS ====================
export const KAFKA_TOPICS = {
    STUDY_EVENTS: 'study-events',
    QUIZ_EVENTS: 'quiz-events',
    GAMIFICATION_EVENTS: 'gamification-events',
    DOCUMENT_EVENTS: 'document-events',
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

    [EVENT_TYPES.XP_AWARDED]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.LEVEL_UP]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.BADGE_EARNED]: KAFKA_TOPICS.GAMIFICATION_EVENTS,
    [EVENT_TYPES.STREAK_UPDATED]: KAFKA_TOPICS.GAMIFICATION_EVENTS,

    [EVENT_TYPES.ROOM_CREATED]: KAFKA_TOPICS.ROOM_EVENTS,
    [EVENT_TYPES.ROOM_JOINED]: KAFKA_TOPICS.ROOM_EVENTS,
    [EVENT_TYPES.ROOM_LEFT]: KAFKA_TOPICS.ROOM_EVENTS,

    [EVENT_TYPES.PAGE_VIEW]: KAFKA_TOPICS.ANALYTICS_EVENTS,
    [EVENT_TYPES.FEATURE_USED]: KAFKA_TOPICS.ANALYTICS_EVENTS,
};

// ==================== EVENT BUS CLASS ====================
class EventBus {
    constructor() {
        this.subscribers = new Map();
        this.eventQueue = [];
        this.isProcessing = false;
        this.kafkaEnabled = true; // Can be toggled for local dev
        this.firestoreEnabled = true;
        this.debugMode = import.meta.env.DEV;
    }

    // ==================== PUBLISH EVENT ====================
    async publish(eventType, payload, options = {}) {
        const event = this._createEvent(eventType, payload, options);

        if (this.debugMode) {
            console.log(`📤 EventBus: ${eventType}`, event);
        }

        // Add to queue for processing
        this.eventQueue.push(event);

        // Process queue
        if (!this.isProcessing) {
            await this._processQueue();
        }

        // Notify local subscribers
        this._notifySubscribers(eventType, event);

        return event;
    }

    // ==================== SUBSCRIBE TO EVENTS ====================
    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType).add(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers.get(eventType)?.delete(callback);
        };
    }

    // ==================== PRIVATE METHODS ====================

    _createEvent(eventType, payload, options) {
        return {
            id: this._generateEventId(),
            type: eventType,
            payload,
            metadata: {
                timestamp: new Date().toISOString(),
                userId: payload.userId || null,
                sessionId: this._getSessionId(),
                source: 'web',
                version: '1.0',
                ...options.metadata
            },
            topic: EVENT_TO_TOPIC[eventType] || KAFKA_TOPICS.ANALYTICS_EVENTS
        };
    }

    async _processQueue() {
        if (this.eventQueue.length === 0) return;

        this.isProcessing = true;

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();

            try {
                // Dual write: Firestore + Kafka
                await Promise.all([
                    this.firestoreEnabled ? this._writeToFirestore(event) : Promise.resolve(),
                    this.kafkaEnabled ? this._sendToKafka(event) : Promise.resolve()
                ]);
            } catch (error) {
                console.error('❌ EventBus: Failed to process event', error);
                // Re-queue failed events (with retry limit)
                if (!event._retryCount || event._retryCount < 3) {
                    event._retryCount = (event._retryCount || 0) + 1;
                    this.eventQueue.push(event);
                }
            }
        }

        this.isProcessing = false;
    }

    async _writeToFirestore(event) {
        try {
            // Write to userEvents collection for real-time listeners
            const eventsRef = collection(db, COLLECTIONS.USER_EVENTS);
            await addDoc(eventsRef, {
                ...event,
                createdAt: serverTimestamp()
            });

            if (this.debugMode) {
                console.log('✅ Event written to Firestore:', event.type);
            }
        } catch (error) {
            console.error('❌ Firestore write failed:', error);
            throw error;
        }
    }

    async _sendToKafka(event) {
        try {
            // Send via Cloud Function (acts as Kafka producer)
            const produceEvent = httpsCallable(functions, 'produceKafkaEvent');
            await produceEvent({
                topic: event.topic,
                event: {
                    key: event.payload.userId || event.id,
                    value: JSON.stringify(event)
                }
            });

            if (this.debugMode) {
                console.log('✅ Event sent to Kafka:', event.topic);
            }
        } catch (error) {
            // Kafka might not be configured - log but don't throw
            if (this.debugMode) {
                console.warn('⚠️ Kafka send failed (ignoring):', error.message);
            }
        }
    }

    _notifySubscribers(eventType, event) {
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

        // Also notify wildcard subscribers
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
    }

    _generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    _getSessionId() {
        if (typeof window === 'undefined') return null;

        let sessionId = sessionStorage.getItem('eventbus_session_id');
        if (!sessionId) {
            sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('eventbus_session_id', sessionId);
        }
        return sessionId;
    }

    // ==================== CONFIGURATION ====================

    setKafkaEnabled(enabled) {
        this.kafkaEnabled = enabled;
    }

    setFirestoreEnabled(enabled) {
        this.firestoreEnabled = enabled;
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// ==================== SINGLETON EXPORT ====================
export const eventBus = new EventBus();

// ==================== CONVENIENCE FUNCTIONS ====================

export const publishStudyEvent = (type, payload) => {
    return eventBus.publish(type, payload);
};

export const publishQuizEvent = (type, payload) => {
    return eventBus.publish(type, payload);
};

export const publishGamificationEvent = (type, payload) => {
    return eventBus.publish(type, payload);
};

export const publishDocumentEvent = (type, payload) => {
    return eventBus.publish(type, payload);
};

export const publishAnalyticsEvent = (type, payload) => {
    return eventBus.publish(type, payload);
};

// ==================== REACT HOOK ====================
export const useEventBus = () => {
    return {
        publish: eventBus.publish.bind(eventBus),
        subscribe: eventBus.subscribe.bind(eventBus),
        EVENT_TYPES
    };
};

export default eventBus;
