const { runOnce, POLL_INTERVAL_MS } = require('./worker');
require('dotenv').config();

let timer = null;

async function start() {
  console.log("Service starting...");
  await runOnce();

  // recurring runs
  timer = setInterval(async () => {
    try {
      await runOnce();
    } catch(err) {
      console.error("Cycle error:", err.message);
    }
  }, POLL_INTERVAL_MS);
}

start();

// graceful shutdown
process.on('SIGINT', () => {
  console.log("Shutting down...");
  if (timer) clearInterval(timer);
  process.exit(0);
});
