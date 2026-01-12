import { getSocket } from "./socket";
let localStream = null;

export const initMedia = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  return localStream;
};

export const raiseHand = (conferenceId) => {
  const socket = getSocket();
  socket.emit("conference:raise-hand", { conferenceId });
};

export const lowerHand = (conferenceId) => {
  const socket = getSocket();
  socket.emit("conference:lower-hand", { conferenceId });
};

export const adminAction = ({
  action,
  targetSocketId,
  conferenceId,
  userId,
}) => {
  const socket = getSocket();

  socket.emit("conference:admin-action", {
    action,
    targetSocketId,
    conferenceId,
    userId,
  });
};


export const getLocalStream = () => localStream;

export const joinConference = (conferenceId) => {
  getSocket().emit("conference:join", conferenceId);
};

export const leaveConference = (conferenceId) => {
  getSocket().emit("conference:leave", conferenceId);
};
