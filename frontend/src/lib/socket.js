// src/lib/socket.js
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_URL;

export const socket = io(URL, {
  withCredentials: true,
  autoConnect: false, // connect manually after auth
});

export default socket;
