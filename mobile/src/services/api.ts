import axios from 'axios';

// Using the computer's local network IP for the physical device Expo app
// (10.0.2.2 is for android emulator, localhost is the phone itself)
const API_URL = 'http://172.18.192.188:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
