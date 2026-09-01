import axios from 'axios';

// Using the computer's actual Wi-Fi IP address
const API_URL = 'http://192.168.137.48:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
