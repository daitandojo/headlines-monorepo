// packages/utils-shared/src/realtimeEvents.js (version 1.0.0)
// This file centralizes the names of all real-time channels and events,
// eliminating "magic strings" and preventing typos between the backend
// that triggers events and the frontend that listens for them.

export const REALTIME_CHANNELS = {
  ARTICLES: 'articles-channel',
  EVENTS: 'events-channel',
}

export const REALTIME_EVENTS = {
  NEW_ARTICLE: 'new-article',
  NEW_EVENT: 'new-event',
}
