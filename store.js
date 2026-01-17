const { Low, JSONFile } = require('lowdb');
const path = require('path');

const file = path.join(__dirname, 'store.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initStore() {
  try {
    await db.read();
  } catch (e) {
    db.data = { deviceStatus: {} };
    try { await db.write(); } catch (_) { /* ignore store write errors */ }
    return;
  }
  if (!db.data || typeof db.data !== 'object') {
    db.data = { deviceStatus: {} };
    try { await db.write(); } catch (_) { /* ignore store write errors */ }
    return;
  }
}

async function updateDeviceStatus(deviceId, patch) {
  try { await db.read(); } catch (_) { /* ignore store read errors */ }
  db.data = db.data || { deviceStatus: {} };
  db.data.deviceStatus = db.data.deviceStatus || {};
  db.data.deviceStatus[deviceId] = { ...(db.data.deviceStatus[deviceId] || {}), ...patch };
  try { await db.write(); } catch (_) { /* ignore store write errors */ }
}

async function getDeviceStatus(deviceId) {
  try { await db.read(); } catch (_) { /* ignore store read errors */ }
  return db.data.deviceStatus[deviceId] || null;
}

module.exports = { initStore, updateDeviceStatus, getDeviceStatus };
