let _onUnauthorized = null;
export function registerLogoutHandler(fn) { _onUnauthorized = fn; }
export function triggerUnauthorized() { _onUnauthorized?.(); }