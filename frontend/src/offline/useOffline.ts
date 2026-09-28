import { useSyncExternalStore } from 'react';
import { getOfflineState, subscribeOffline } from './status';

/** React hook: { isOffline, dataFrom, justReconnected } */
export const useOffline = () => useSyncExternalStore(subscribeOffline, getOfflineState);