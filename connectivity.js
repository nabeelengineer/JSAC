const axios = require("axios");
require('dotenv').config();

const DATA_URL = process.env.DATA_URL;

async function getProcessValue(token, deviceId) {
  try {
    if (!DATA_URL) throw new Error('DATA_URL not configured');
    const res = await axios.get(DATA_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: { deviceId },
      timeout: 15000
    });
    const body = res.data;
    if (body && Array.isArray(body.data) && body.data.length > 0) {
      const prefer = body.data.find(x => ['pm10', 'PM10', 'pm', 'PM', 'spm', 'SPM'].includes(String(x.key).toLowerCase())) || body.data[0];
      const num = Number(prefer.value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  } catch (err) {
    throw err;
  }
}

module.exports = { getProcessValue };
