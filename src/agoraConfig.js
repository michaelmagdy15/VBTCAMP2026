import AgoraRTC from "agora-rtc-sdk-ng";

export const AGORA_APP_ID = "64b2de4f075a47e080329c3166ba192c";

// Create the Agora client instance using the core SDK so we can pass it to the React Provider
export const agoraClient = AgoraRTC.createClient({ 
  mode: "rtc", 
  codec: "vp8" 
});
