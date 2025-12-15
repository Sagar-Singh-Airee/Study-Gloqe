// src/shared/services/kafkaProducer.js
// Kafka Producer Service for Event Streaming
// Sends events to Confluent Kafka via Cloud Functions

import { httpsCallable } from 'firebase/functions';
import { functions } from '@shared/config/firebase';
import { KAFKA_TOPICS } from './eventBus';

// ==================== KAFKA PRODUCER CLASS ====================
class KafkaProducer {
    constructor() {
        this.isEnabled = true;
        this.queue = [];
        this.batchSize = 10;
        this.flushInterval = 5000; // 5 seconds
        this.flushTimer = null;
        this.debugMode = import.meta.env.DEV;

        // Start flush timer
        this._startFlushTimer();
    }

    // ==================== PRODUCE SINGLE EVENT ====================
    async produce(topic, event) {
        if (!this.isEnabled) {
            if (this.debugMode) console.log('⚠️ Kafka producer disabled');
            return { success: false, reason: 'disabled' };
        }

        // Add to queue
        this.queue.push({
            topic,
            key: event.key || event.userId || this._generateKey(),
            value: typeof event === 'string' ? event : JSON.stringify(event),
            timestamp: Date.now()
        });

        // Flush if batch size reached
        if (this.queue.length >= this.batchSize) {
            await this._flush();
        }

        return { success: true, queued: true };
    }

    // ==================== PRODUCE BATCH ====================
    async produceBatch(topic, events) {
        const messages = events.map(event => ({
            topic,
            key: event.key || event.userId || this._generateKey(),
            value: typeof event === 'string' ? event : JSON.stringify(event),
            timestamp: Date.now()
        }));

        this.queue.push(...messages);

        if (this.queue.length >= this.batchSize) {
            await this._flush();
        }

        return { success: true, count: events.length };
    }

    // ==================== CONVENIENCE METHODS ====================

    async produceStudyEvent(event) {
        return this.produce(KAFKA_TOPICS.STUDY_EVENTS, event);
    }

    async produceQuizEvent(event) {
        return this.produce(KAFKA_TOPICS.QUIZ_EVENTS, event);
    }

    async produceGamificationEvent(event) {
        return this.produce(KAFKA_TOPICS.GAMIFICATION_EVENTS, event);
    }

    async produceDocumentEvent(event) {
        return this.produce(KAFKA_TOPICS.DOCUMENT_EVENTS, event);
    }

    async produceAnalyticsEvent(event) {
        return this.produce(KAFKA_TOPICS.ANALYTICS_EVENTS, event);
    }

    async produceNotificationEvent(event) {
        return this.produce(KAFKA_TOPICS.NOTIFICATION_EVENTS, event);
    }

    async produceAuditLog(event) {
        return this.produce(KAFKA_TOPICS.AUDIT_LOGS, {
            ...event,
            type: 'audit',
            timestamp: new Date().toISOString()
        });
    }

    // ==================== PRIVATE METHODS ====================

    async _flush() {
        if (this.queue.length === 0) return;

        const batch = this.queue.splice(0, this.batchSize);

        try {
            // Group by topic for efficient sending
            const byTopic = batch.reduce((acc, msg) => {
                if (!acc[msg.topic]) acc[msg.topic] = [];
                acc[msg.topic].push({ key: msg.key, value: msg.value });
                return acc;
            }, {});

            // Send to Cloud Function
            const produceEvents = httpsCallable(functions, 'produceKafkaEvents');
            await produceEvents({ batches: byTopic });

            if (this.debugMode) {
                console.log(`✅ Kafka: Flushed ${batch.length} events`);
            }
        } catch (error) {
            // Re-queue failed messages
            this.queue.unshift(...batch);

            if (this.debugMode) {
                console.warn('⚠️ Kafka flush failed, re-queued', error.message);
            }
        }
    }

    _startFlushTimer() {
        if (this.flushTimer) clearInterval(this.flushTimer);

        this.flushTimer = setInterval(() => {
            if (this.queue.length > 0) {
                this._flush();
            }
        }, this.flushInterval);
    }

    _generateKey() {
        return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ==================== CONFIGURATION ====================

    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    setBatchSize(size) {
        this.batchSize = size;
    }

    setFlushInterval(interval) {
        this.flushInterval = interval;
        this._startFlushTimer();
    }

    // Get queue stats
    getStats() {
        return {
            queuedEvents: this.queue.length,
            isEnabled: this.isEnabled,
            batchSize: this.batchSize,
            flushInterval: this.flushInterval
        };
    }

    // Force flush
    async forceFlush() {
        while (this.queue.length > 0) {
            await this._flush();
        }
    }

    // Cleanup
    destroy() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        this.forceFlush();
    }
}

// ==================== SINGLETON EXPORT ====================
export const kafkaProducer = new KafkaProducer();

// ==================== DEFAULT EXPORT ====================
export default kafkaProducer;
