export async function withTouchEmulation(page, run) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    const dispatchTouch = (type, x, y) => session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ id: 1, x, y }],
    });
    await run(dispatchTouch);
  } finally {
    await session.detach();
  }
}
