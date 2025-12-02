import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const hmsConfig = {
    appAccessKey: process.env.HMS_APP_ACCESS_KEY,
    appSecret: process.env.HMS_APP_SECRET,
};

export const validateHmsConfig = () => {
    if (!hmsConfig.appAccessKey || !hmsConfig.appSecret) {
        throw new Error('HMS credentials not configured. Check your .env file.');
    }
};
