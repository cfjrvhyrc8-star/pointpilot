export async function authStep(action, label, timeoutMs = 12000) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(action),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out. Close other PointPilot tabs, then request a fresh link in this same browser.`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
