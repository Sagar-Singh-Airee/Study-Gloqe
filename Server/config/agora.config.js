// config/agora.config.js
import dotenv from 'dotenv';
dotenv.config();

export default {
  appId: process.env.AGORA_APP_ID,
  appCertificate: process.env.AGORA_APP_CERTIFICATE,
  tokenExpirationTime: 3600, // 1 hour in seconds
};
