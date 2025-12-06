// middleware/auth.middleware.js

export const validateRequest = (req, res, next) => {
    const { roomId, userId } = req.body;

    // Validate roomId
    if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Valid roomId is required'
        });
    }

    // Validate userId - Agora accepts numbers or 0 for auto-assign
    // Make it optional, but if provided must be valid
    if (userId !== undefined && userId !== null) {
        const numericUserId = parseInt(userId);
        if (isNaN(numericUserId)) {
            return res.status(400).json({
                success: false,
                error: 'userId must be a valid number'
            });
        }
        // Attach numeric userId to request for controller
        req.numericUserId = numericUserId;
    } else {
        // If no userId provided, Agora will auto-assign (use 0)
        req.numericUserId = 0;
    }

    next();
};

const requestCounts = new Map();

export const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 30;

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }

    const record = requestCounts.get(ip);

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return next();
    }

    if (record.count >= maxRequests) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.'
        });
    }

    record.count++;
    next();
};

// Optional: Clean up old entries periodically (prevents memory leak)
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
        if (now > record.resetTime + 60000) {
            requestCounts.delete(ip);
        }
    }
}, 300000); // Clean every 5 minutes
