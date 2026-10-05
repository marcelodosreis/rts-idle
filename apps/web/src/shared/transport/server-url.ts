const { VITE_SERVER_URL } = import.meta.env

export const MATCH_SERVER_URL = VITE_SERVER_URL ?? 'ws://localhost:8080'
