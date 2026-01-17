# Jharkhand Forwarder

A Node.js service that periodically collects PM10 readings per device and forwards them to the Jharkhand API. Each device can either:
- send a random integer value (for testing/demo), or
- fetch a live value from your data source API.

Selection is controlled per device via `config/industries.json`.


## Features
- Single codebase supports two lists of devices:
  - Randomized devices: `useRandom: true` with configurable range or discrete set.
  - Normal devices: no flag; values fetched via your API (`connectivity.js`).
- Periodic scheduling with `POLL_INTERVAL_MS`.
- Simple local status store `store.json` (resilient to Windows file locks).
- Debug logging via `DEBUG_JH=true`.


## Project structure
- `index.js` – service entrypoint; runs a cycle then schedules next runs.
- `worker.js` – iterates devices, resolves config, gets value (random or API), and sends to Jharkhand.
- `config.js` – loads and caches `config/industries.json`, exposes helpers.
- `config/industries.json` – device mappings and options.
- `auth.js` – obtains token for your data source API.
- `connectivity.js` – fetches live value from your data source API for a device.
- `jharkhand.js` – builds the Jharkhand URL and sends the data.
- `store.js` – local status persistence (last success/attempt, retry count, online flag).


## Requirements
- Node.js 18+ (tested on Node 22)
- Internet access to your data source and Jharkhand endpoint


## Environment variables (.env)
Create a `.env` file in the project root with the following keys:

- `LOGIN_URL` – URL to obtain a bearer token for your data source
- `EMAIL` – login email for the data source
- `PASSWORD` – login password for the data source
- `DATA_URL` – data source endpoint to fetch process value (expects `GET` with `deviceId`)
- `JH_API` – Jharkhand API base URL (e.g., https://jsac.jharkhand.gov.in/Pollution/WebService.asmx/GET_PM_DATA)
- `JH_VENDOR_ID` – vendor id required by Jharkhand API (fallback if not provided in per-device config)
- `JH_UNIT` – unit for Jharkhand API (fallback if not provided in per-device config)
- `POLL_INTERVAL_MS` – interval between cycles (default: 900000 ms = 15 min)
- `DEBUG_JH` – set to `true` to print debug logs


## Device configuration (config/industries.json)
Example entry (randomized device):

```json
{
  "key": "ENE05263",
  "vendorId": "41",
  "industryId": "Salbona161",
  "stationId": "JRK61",
  "analyserId": "ENE05263",
  "unit": "ug/m3",
  "useRandom": true,
  "randomMin": 30,
  "randomMax": 100
}
```

Alternative: use a discrete set instead of a range:

```json
{
  "key": "ENE05263",
  "useRandom": true,
  "randomValues": [20, 40, 65, 75]
}
```

Normal device (live API value):

```json
{
  "key": "ENE05268",
  "vendorId": "41",
  "industryId": "Dokania164",
  "stationId": "JRK64",
  "analyserId": "ENE05268",
  "unit": "ug/m3"
}
```

Notes
- `useRandom: true` switches a device to random mode.
- If `randomValues` is present and non-empty, one value is chosen randomly from that list.
- Otherwise, an integer is chosen uniformly in `[randomMin, randomMax]`.
- Defaults in code are currently 30–110, but you can override per device (recommended to keep within policy limits, e.g., 30–100 if the API rejects >100 for PM10).
- The loader merges top-level `defaults` with per-device entries.
- The config is cached at startup; restart the process after editing the file.


## How values are chosen per device
In `worker.js`:
- `cfg = getIndustryConfigFor(deviceId)` reads your mapping.
- If `cfg.useRandom` is true:
  - If `cfg.randomValues` exists, pick from that array.
  - Else, call `getRandomValue(cfg.randomMin ?? 30, cfg.randomMax ?? 110)` which returns an integer.
- Else (no `useRandom`), the service calls `getProcessValue(token, deviceId)` to fetch a live value from your data source API.
- Finally, the value is sent to the Jharkhand API with two-decimal formatting.

This is how the same codebase supports “two lists”: random devices and normal devices.


## Running
- Install dependencies: `npm install`
- Create `.env` and fill variables (see above)
- Start the service: `node index.js`

The service runs one full cycle immediately, then repeats every `POLL_INTERVAL_MS`.


## Troubleshooting
- All devices failing with `code=3`:
  - Verify parameter constraints (e.g., PM10 may reject values >100). Try `randomMax: 100`.
  - Compare a working Postman request to the script’s built URL (enable `DEBUG_JH=true`).
- Random values not applied:
  - Ensure `useRandom: true` for that device in `config/industries.json`.
  - Restart the service to refresh the cached config.
- EPERM on `store.json` (Windows file locks):
  - We swallow store write errors so cycles continue, but closing editors/AV that hold locks helps.
- No logs:
  - Set `DEBUG_JH=true` to print prepared params and Jharkhand responses.


## Security
- Do not commit `.env` with credentials.
- Avoid logging secrets. Debug logs focus on parameters and response codes.


## FAQ
- Can we send random data as well as fetch from API and send to Jharkhand?
  - Yes. For devices with `useRandom: true`, the service sends randomized integers (range or discrete list). For all others, it fetches the current value from your data source API and forwards that. Both behaviors run together in the same cycle using the same codebase.
