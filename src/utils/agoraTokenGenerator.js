// src/utils/agoraTokenGenerator.js
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const APP_CERTIFICATE = import.meta.env.VITE_AGORA_APP_CERTIFICATE;

export const generateAgoraToken = (channelName, uid) => {
    // Token expiry time (24 hours from now)
    const expirationTimeInSeconds = 86400; // 24 hours
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Build token
    const token = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        uid,
        RtcRole.PUBLISHER, // User can publish and subscribe
        privilegeExpiredTs
    );

    return token;
};
