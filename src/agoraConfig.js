import AgoraRTC from "agora-rtc-sdk-ng";
import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;

export const AGORA_APP_ID = "64b2de4f075a47e080329c3166ba192c";
const AGORA_APP_CERTIFICATE = "9e2b092750db456ebb625b6dc56e88ec";

// Create the Agora client instance using the core SDK so we can pass it to the React Provider
export const agoraClient = AgoraRTC.createClient({ 
  mode: "rtc", 
  codec: "vp8" 
});

export function generateAgoraToken(channelName) {
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600 * 24; // 24 hours
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID, 
    AGORA_APP_CERTIFICATE, 
    channelName, 
    0, 
    role, 
    privilegeExpiredTs
  );
}
