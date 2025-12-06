// controllers/token.controller.js
import agoraAccessToken from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = agoraAccessToken;

import agoraConfig from '../config/agora.config.js';

// Generate RTC Token for video calls
export const generateRTCToken = (req, res) => {
  try {
    // Set response headers to prevent caching
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Content-Type', 'application/json');

    // Get parameters from request
    const channelName = req.params.channelName || req.body.channelName;
    let uid = req.params.uid || req.body.uid || 0;
    const role = req.params.role || req.body.role || 'publisher';

    // Validate required parameters
    if (!channelName) {
      return res.status(400).json({ 
        success: false,
        error: 'Channel name is required' 
      });
    }

    // Convert uid to number (Agora requires numeric UID)
    uid = parseInt(uid) || 0;

    // Determine user role
    let userRole;
    if (role === 'publisher') {
      userRole = RtcRole.PUBLISHER;
    } else if (role === 'subscriber') {
      userRole = RtcRole.SUBSCRIBER;
    } else {
      userRole = RtcRole.PUBLISHER; // Default to publisher
    }

    // Calculate token expiration time
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expirationTimeInSeconds = agoraConfig.tokenExpirationTime;
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Build the token
    const token = RtcTokenBuilder.buildTokenWithUid(
      agoraConfig.appId,
      agoraConfig.appCertificate,
      channelName,
      uid,
      userRole,
      privilegeExpiredTs
    );

    // Return response
    return res.status(200).json({
      success: true,
      token: token,
      appId: agoraConfig.appId,
      channelName: channelName,
      uid: uid,
      role: role,
      expiresIn: expirationTimeInSeconds
    });

  } catch (error) {
    console.error('Error generating RTC token:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to generate token',
      message: error.message 
    });
  }
};

// Generate token for study room (simplified endpoint)
export const generateStudyRoomToken = async (req, res) => {
  try {
    const { roomId } = req.body;
    
    // Use validated numeric UID from middleware (if validateRequest was used)
    // Otherwise fall back to req.body.userId or req.user
    const uid = req.numericUserId ?? parseInt(req.body.userId) ?? req.user?.uid ?? 0;

    // Validate roomId
    if (!roomId) {
      return res.status(400).json({ 
        success: false,
        error: 'Room ID is required' 
      });
    }

    // Use roomId as channel name
    const channelName = `study-room-${roomId}`;

    // Calculate expiration
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + agoraConfig.tokenExpirationTime;

    // Generate token (all users are publishers in study rooms)
    const token = RtcTokenBuilder.buildTokenWithUid(
      agoraConfig.appId,
      agoraConfig.appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    return res.status(200).json({
      success: true,
      token: token,
      appId: agoraConfig.appId,
      channelName: channelName,
      uid: uid,
      roomId: roomId,
      expiresIn: agoraConfig.tokenExpirationTime
    });

  } catch (error) {
    console.error('Error generating study room token:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to generate study room token',
      message: error.message 
    });
  }
};

// Test endpoint to verify token generation
export const testTokenGeneration = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Agora Token Service is running',
    appId: agoraConfig.appId,
    configured: !!(agoraConfig.appId && agoraConfig.appCertificate),
    timestamp: new Date().toISOString()
  });
};
