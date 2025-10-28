module.exports = (bot) => {
  bot.command("start", (ctx) => {
    ctx.reply("👋 Salut ! Le bot Telegram est actif.\n\nTape /sauvegarde pour recevoir les données.");
  });
};