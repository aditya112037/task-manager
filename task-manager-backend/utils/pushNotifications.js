const webpush = require("web-push");
const User = require("../models/user");

let vapidConfigured = false;

const ensureVapidConfigured = () => {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT_EMAIL || "mailto:no-reply@example.com";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
  vapidConfigured = true;
  return true;
};

const isSubscriptionGone = (error) => {
  const code = error?.statusCode || error?.status;
  return code === 404 || code === 410;
};

const normalizePayload = (payload = {}) =>
  JSON.stringify({
    title: payload.title || "Task Manager",
    body: payload.body || "",
    icon: payload.icon || "/logo192.png",
    badge: payload.badge || "/logo192.png",
    url: payload.url || "/",
    tag: payload.tag || "task-manager",
    data: payload.data || {},
  });

const sendPushToUsers = async (userIds = [], payload = {}) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  if (!ensureVapidConfigured()) return;

  const users = await User.find({ _id: { $in: userIds } }).select(
    "_id pushSubscriptions"
  );
  const body = normalizePayload(payload);

  for (const user of users) {
    const subscriptions = user.pushSubscriptions || [];
    if (subscriptions.length === 0) continue;

    const staleEndpoints = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime || null,
            keys: subscription.keys,
          },
          body
        );
      } catch (error) {
        if (isSubscriptionGone(error)) {
          staleEndpoints.push(subscription.endpoint);
        }
      }
    }

    if (staleEndpoints.length > 0) {
      await User.updateOne(
        { _id: user._id },
        { $pull: { pushSubscriptions: { endpoint: { $in: staleEndpoints } } } }
      );
    }
  }
};

module.exports = {
  ensureVapidConfigured,
  sendPushToUsers,
};

