const delay = (ms) => new Promise(res => setTimeout(res, ms));

function loadingBar(step, total) {
  const filled = "■".repeat(step);
  const empty = "□".repeat(total - step);
  const percent = Math.floor((step / total) * 100);
  return `[${filled}${empty}] ${percent}%`;
}

module.exports = {
  name: "ping",
  category: "Général",
  description: "Ping avec animation à la vitesse réelle.",
  allowedForAll: true,
  async execute(riza, m) {
    const totalSteps = 10;
    const start = Date.now();

    const sentMsg = await riza.sendMessage(m.chat, {
      text: loadingBar(0, totalSteps)
    }, { quoted: m });

    const latency = Date.now() - start;
    const totalDuration = Math.min(latency, 2000);
    const delayMs = totalDuration / totalSteps;

    for (let i = 1; i <= totalSteps; i++) {
      await delay(delayMs);
      await riza.sendMessage(m.chat, {
        edit: sentMsg.key,
        text: loadingBar(i, totalSteps)
      });
    }

    await riza.sendMessage(m.chat, {
      edit: sentMsg.key,
      text: `*Pong !* ⏱️ Latence : *${latency} ms !!!*`
    });
  }
};