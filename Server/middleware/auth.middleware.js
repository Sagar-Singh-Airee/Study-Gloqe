export const validateRequest = (req, res, next) => {
    const { roomId, userId } = req.body;

    if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Valid roomId is required'
        });
    }

    if (!userId || typeof userId !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Valid userId is required'
        });
    }

    next();
};

const requestCounts = new Map();

export const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60000;
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