// ─── VBT Sports Camp — Push Notification Service ─────────────────────
// Deployed on Cloud Run. Sends Web Push to all subscribed devices when
// announcements / alerts are posted.
//
// Endpoints:
//   GET  /health            — health check
//   GET  /vapid-public-key  — returns the VAPID public key for clients
//   POST /subscribe         — register a browser push subscription
//   POST /notify            — send push to ALL subscribers
//   POST /test              — send a test push to ALL subscribers
// ─────────────────────────────────────────────────────────────────────

const express  = require('express');
const webpush  = require('web-push');
const admin    = require('firebase-admin');
const { RtcTokenBuilder, RtcRole } = require('agora-token');

// ── Firebase Admin (uses Cloud Run service account automatically) ──────
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId : 'faa-test-guide-v2',
});
const db = admin.firestore();
// Point to the dedicated VBT Firestore database
db.settings({ databaseId: 'db-vbt' });

// ── VAPID keys (generated with: npx web-push generate-vapid-keys) ─────
const VAPID_PUBLIC_KEY  = 'BE7Vwn_moGbtJ4gXEFj61BnvQ5HEnbmaaLneCm-65ITNq2CyzcdxtwqfrfyDar_EjMT8IpP1B_AmnPxk9NDYeTw';
const VAPID_PRIVATE_KEY = 'yrz2XZgAsvnmihKclCK3y9zuGPdOE3i-2J_uGOTF1Mw';
const VAPID_SUBJECT     = 'mailto:admin@vbtcamp.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ── Express ───────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS — allow the VBT web app to call this service from any origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const API_KEY = process.env.API_KEY || 'vbt_secret_camp_2026_key';

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
}

const AGORA_APP_ID = process.env.AGORA_APP_ID || '64b2de4f075a47e080329c3166ba192c';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '9e2b092750db456ebb625b6dc56e88ec';

// ── Health check ──────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vbt-notify', ts: new Date().toISOString() });
});

// ── VAPID public key (clients need this to subscribe) ─────────────────
app.get('/vapid-public-key', (_req, res) => {
  res.json({ key: VAPID_PUBLIC_KEY });
});

// ── Register push subscription ────────────────────────────────────────
// Body: { uid, name, role, subscription: { endpoint, keys: { p256dh, auth } } }
app.post('/subscribe', async (req, res) => {
  const { uid, name, role, subscription } = req.body;
  if (!uid || !subscription?.endpoint) {
    return res.status(400).json({ error: 'uid and subscription.endpoint are required' });
  }
  try {
    await db.collection('vbt_web_push_subscriptions').doc(uid).set({
      subscription,
      name : name || 'Unknown',
      role : role || 'viewer',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`[VBT Notify] Registered subscription for uid=${uid}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[VBT Notify] Error saving subscription:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Core send function ────────────────────────────────────────────────
async function sendToAll(payload) {
  const snap = await db.collection('vbt_web_push_subscriptions').get();
  if (snap.empty) return { sent: 0, failed: 0, total: 0 };

  const results = await Promise.allSettled(
    snap.docs.map(async (docSnap) => {
      const { subscription } = docSnap.data();
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return { uid: docSnap.id, ok: true };
      } catch (err) {
        // 410 / 404 = subscription expired — clean up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.collection('vbt_web_push_subscriptions').doc(docSnap.id).delete();
          console.log(`[VBT Notify] Removed stale subscription: ${docSnap.id}`);
        } else {
          console.warn(`[VBT Notify] Failed for ${docSnap.id}: HTTP ${err.statusCode} — ${err.message} — body: ${err.body}`);
        }
        return { uid: docSnap.id, ok: false, err: err.message };
      }
    })
  );

  const sent   = results.filter(r => r.value?.ok).length;
  const failed = results.filter(r => !r.value?.ok).length;
  console.log(`[VBT Notify] Sent ${sent}/${snap.size} pushes`);
  return { sent, failed, total: snap.size };
}

// ── /notify — send announcement push to everyone ──────────────────────
// Body: { title, body, type?, url? }
app.post('/notify', requireApiKey, async (req, res) => {
  const { title, body, type = 'announcement', url = '/' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  try {
    const stats = await sendToAll({ title, body, data: { type, url } });
    res.json({ success: true, ...stats });
  } catch (err) {
    console.error('[VBT Notify] /notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /test — sends a test push immediately, great for debugging ────────
app.post('/test', requireApiKey, async (req, res) => {
  try {
    const snap = await db.collection('vbt_web_push_subscriptions').get();
    if (snap.empty) {
      return res.json({
        success: false,
        message: 'No subscribers yet. Open the app, grant notifications, and try again.',
        total: 0,
      });
    }
    const stats = await sendToAll({
      title : 'VBT SERVICE',
      body  : 'Push notifications are working! You are all set for camp.',
      data  : { type: 'test', url: '/' },
    });
    res.json({ success: true, ...stats });
  } catch (err) {
    console.error('[VBT Notify] /test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /subscribers — how many devices are registered (for debugging) ────
app.get('/subscribers', requireApiKey, async (_req, res) => {
  try {
    const snap = await db.collection('vbt_web_push_subscriptions').get();
    const list = snap.docs.map(d => ({
      uid  : d.id,
      name : d.data().name,
      role : d.data().role,
    }));
    res.json({ count: snap.size, subscribers: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── /agora-token — generate Agora RTC token ─────────────────────────
app.post('/agora-token', requireApiKey, (req, res) => {
  const { channelName } = req.body;
  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required' });
  }
  try {
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600 * 24; // 24 hours
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      0,
      role,
      privilegeExpiredTs
    );
    res.json({ token });
  } catch (err) {
    console.error('Error generating Agora token:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[VBT Notify] Listening on :${PORT}`);
  console.log(`[VBT Notify] VAPID public key: ${VAPID_PUBLIC_KEY}`);
});
