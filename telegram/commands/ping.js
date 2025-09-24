module.exports = (bot) => {
  bot.command("ping", async (ctx) => {
    try {
      const start = Date.now();
      
      const message = await ctx.reply("🏓 Calcul de la latence...");
      
      const latency = Date.now() - start;
      
      const pingText = `
🏓 *PONG !*

⚡ Latence : ${latency}ms
🤖 Bot : En ligne
🧠 IA : Gemini AI
⏱️ Uptime : ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m

Status : ✅ Opérationnel
      `.trim();

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        message.message_id,
        undefined,
        pingText,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error("Erreur ping.js :", error);
      await ctx.reply("❌ Une erreur est survenue lors du test de latence.");
    }
  });
};