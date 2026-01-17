const axios = require("axios");
require('dotenv').config();

const JH_API = process.env.JH_API;
const VENDER_ID = process.env.JH_VENDOR_ID;
const UNIT = process.env.JH_UNIT;
const DEBUG_JH = !!process.env.DEBUG_JH;

function buildEncodedLocalTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return encodeURIComponent(ts);
}

function encTrim(v) {
  return encodeURIComponent(String(v == null ? '' : v).trim());
}

function buildUrlForParam(params) {
  const { industryId, stationId, analyserId, processValue } = params;
  const vendorId = (params.vendorId || VENDER_ID);
  const unit = (params.unit || UNIT);
  const parameter = (params.parameter || 'PM10');
  const timestamp = buildEncodedLocalTimestamp();
  const ind = encTrim(industryId);
  const sta = encTrim(stationId);
  const ana = encTrim(analyserId);
  const pv = encTrim(processValue);

  const url = `${JH_API}?vender_id=${encodeURIComponent(vendorId || '')}&industry_id=${ind}&stationId=${sta}&analyserId=${ana}&processValue=${pv}&scaledValue=0&flag=U&timestamp=${timestamp}&unit=${encodeURIComponent(unit || '')}&parameter=${encodeURIComponent(parameter)}`;
  return url;
}

async function sendPMData(buildParams) {
  const url = buildUrlForParam(buildParams);
  const res = await axios.get(url, { timeout: 15000, responseType: 'text' });
  // res.data is xml like: <int xmlns="http://tempuri.org/">3</int> or 1
  const body = res.data.toString();
  // if (DEBUG_JH) {
  //   console.log("Jh response status:", res.status);
  //   console.log("Jh response body:", body);
  // }
  if (body.includes(">1<")) return { success: true, code: 1, raw: body };
  if (body.includes(">0<")) return { success: false, code: 0, raw: body };
  if (body.includes(">3<")) {
    // if (DEBUG_JH) {
    //   console.log("Jh send failed (code=3). URL:", url);
    //   console.log("Response:", body);
    // }
    return { success: false, code: 3, raw: body };
  }
  // fallback: not recognized
  // if (DEBUG_JH) {
  //   console.log("Jh send unrecognized response. URL:", url);
  // }
  return { success: false, code: null, raw: body };
}

module.exports = { sendPMData, buildUrlForParam };
