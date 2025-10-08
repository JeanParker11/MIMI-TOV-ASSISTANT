const zipAndSend = require("../utils/zipAndSend");
const settings = require("../../settings");

module.exports = (bot) => {
  bot.command("sauvegarde", async (ctx) => {
    await zipAndSend(bot, ctx.chat.id);
  });
};