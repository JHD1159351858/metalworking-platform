export function isBrowserKey(value) {
  if (!value) return false;
  if (/^sb_publishable_[\w-]+$/.test(value)) return true;
  try {
    const parts = value.split('.');
    if (parts.length !== 3) return false;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon';
  } catch {
    return false;
  }
}
