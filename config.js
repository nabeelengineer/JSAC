const fs = require('fs');
const path = require('path');

let cached = null;

function loadRaw() {
  if (cached) return cached;
  const file = path.join(__dirname, 'config', 'industries.json');
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  if (!json || !Array.isArray(json.mappings)) {
    throw new Error('Invalid config: mappings array missing');
  }
  const seen = new Set();
  for (const m of json.mappings) {
    if (!m.key) throw new Error('Invalid config: mapping without key');
    if (seen.has(m.key)) throw new Error(`Duplicate mapping key: ${m.key}`);
    seen.add(m.key);
  }
  cached = json;
  return cached;
}

function getDefaults() {
  const raw = loadRaw();
  return raw.defaults || {};
}

function getIndustryConfigFor(deviceId) {
  const raw = loadRaw();
  const found = raw.mappings.find(m => String(m.key).trim().toLowerCase() === String(deviceId).trim().toLowerCase());
  if (!found) return null;
  const defaults = raw.defaults || {};
  return { ...defaults, ...found };
}

function getAllDeviceKeys() {
  const raw = loadRaw();
  return raw.mappings.map(m => m.key);
}

module.exports = { getIndustryConfigFor, getDefaults, getAllDeviceKeys };
