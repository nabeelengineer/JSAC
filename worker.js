const { login } = require('./auth');
const { getProcessValue } = require('./connectivity');
const { sendPMData } = require('./jharkhand');
const { initStore, updateDeviceStatus, getDeviceStatus } = require('./store');
const { getIndustryConfigFor, getDefaults, getAllDeviceKeys } = require('./config');
require('dotenv').config();

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '900000', 10);
const DEBUG_JH = !!process.env.DEBUG_JH;

function getRandomValue(min = 20, max = 95) {
  const lo = Math.ceil(Number(min) || 0);
  const hi = Math.floor(Number(max) || 0);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function mapConfigToJhParams(deviceId, processValue) {
  const cfg = getIndustryConfigFor(deviceId) || {};
  const defaults = getDefaults() || {};

  const vendorId = cfg.vendorId || null;
  const unit = cfg.unit || defaults.unit || null;
  const parameter = cfg.parameter || defaults.parameter || 'PM10';

  const industryId = cfg.industryId || deviceId;
  const stationId = cfg.stationId || deviceId;
  const analyserId = cfg.analyserId || deviceId;
  // if (DEBUG_JH) {
  //   console.log('Mapped params:', {
  //     industryId,
  //     stationId,
  //     analyserId,
  //     processValue,
  //     vendorId,
  //     unit,
  //     parameter
  //   });
  // }
  return { industryId, stationId, analyserId, processValue, vendorId, unit, parameter };
}

async function processDevice(token, device) {
  const deviceId = typeof device === 'string' ? device : device.deviceId;
  try {
    const cfg = getIndustryConfigFor(deviceId);

    let value;
    if (cfg?.useRandom) {
      if (Array.isArray(cfg.randomValues) && cfg.randomValues.length > 0) {
        const idx = Math.floor(Math.random() * cfg.randomValues.length);
        value = Number(cfg.randomValues[idx]);
      } else {
        const min = cfg.randomMin ?? 20;
        const max = cfg.randomMax ?? 95;
        value = getRandomValue(min, max);
      }
      // console.log(`[${deviceId}] Random value used -> ${value}`);
    } else {
      value = await getProcessValue(token, deviceId);
    }
    const params = mapConfigToJhParams(deviceId, value);
    // if (DEBUG_JH) {
    //   console.log(`[${deviceId}] Prepared params -> value=${value}, industryId=${params.industryId}, stationId=${params.stationId}, analyserId=${params.analyserId}`);
    // }
    const res = await sendPMData(params);

    if (res.success) {
      await updateDeviceStatus(deviceId, { lastSuccess: new Date().toISOString(), retryCount: 0, online: true });
      console.log(`[${deviceId}] Sent -> success`);
    } else {
      await updateDeviceStatus(deviceId, { lastAttempt: new Date().toISOString(), online: true });
      console.log(`[${deviceId}] Jh failed code=${res.code}. Will try next cycle.`);
    }
  } catch (err) {
    await updateDeviceStatus(deviceId, { lastAttempt: new Date().toISOString(), online: false });
    console.log(`[${deviceId}] Error: ${err.message}. Will try next cycle.`);
  }
}

async function runOnce() {
  await initStore();
  const { token } = await login();
  const devicesToProcess = getAllDeviceKeys();
  for (const deviceId of devicesToProcess) {
    await processDevice(token, deviceId);
  }
}

module.exports = { runOnce, POLL_INTERVAL_MS };
