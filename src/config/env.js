/**
 * env.js — Centralised app configuration for SmartCabz Employee App.
 *
 * All environment-specific values live here. No raw URLs or keys should
 * appear anywhere else in the codebase.
 *
 * ─── How to use ───────────────────────────────────────────────────────────────
 *   import { ENV } from '../config/env';
 *   const api = axios.create({ baseURL: ENV.API_BASE_URL });
 *
 * ─── How to extend for multiple environments / a Maps API key ────────────────
 * When you're ready to separate staging vs production, or add the Google
 * Maps API key for live tracking (see project CLAUDE.md Future Feature #1),
 * install:
 *   npx expo install expo-constants
 *
 * Then replace the static object below with:
 *   import Constants from 'expo-constants';
 *   const extra = Constants.expoConfig?.extra ?? {};
 *   export const ENV = {
 *     API_BASE_URL: extra.apiBaseUrl ?? 'https://smartapi.studiohalfx.com',
 *     GOOGLE_MAPS_API_KEY: extra.googleMapsApiKey ?? '',
 *     ...
 *   };
 *
 * And declare the values in app.json under:
 *   "expo": { "extra": { "apiBaseUrl": "https://...", "googleMapsApiKey": "..." } }
 *
 * This allows different values per build profile (eas.json) without
 * touching source code.
 */

export const ENV = {
  /** Base URL for all API calls. */
  API_BASE_URL: 'https://smartapi.studiohalfx.com',

  /** Axios request timeout in milliseconds. */
  API_TIMEOUT: 15000,
};
