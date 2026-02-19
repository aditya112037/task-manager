import { notificationsAPI } from "./api";

const isLocalhost = () =>
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const isPushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  (window.isSecureContext || isLocalhost());

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerForPushNotifications = async () => {
  if (!isPushSupported()) return;
  if (!localStorage.getItem("token")) return;
  if (Notification.permission === "denied") return;

  const keyRes = await notificationsAPI.getPushVapidPublicKey();
  const publicKey = keyRes?.data?.publicKey;
  if (!publicKey) return;

  const registration = await navigator.serviceWorker.ready;
  if (!registration) return;

  let permission = Notification.permission;
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await notificationsAPI.subscribePush(subscription.toJSON());
};

export const unsubscribeFromPushNotifications = async () => {
  if (!isPushSupported()) return;
  if (!localStorage.getItem("token")) return;

  const registration = await navigator.serviceWorker.ready;
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await notificationsAPI.unsubscribePush(subscription.endpoint);
  await subscription.unsubscribe();
};

