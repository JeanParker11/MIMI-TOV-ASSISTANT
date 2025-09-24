const delay = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = {
  name: "discours",
  category: "JEUX",
  description: "Souhaite un joyeux mariage avec un long discours personnalisé",
  allowedForAll: true,

  async execute(riza, m) {
    const chat = m.chat;

    const messages = [
      "📢 *Mesdames et Messieurs...*",
      "🌹 *Veuillez vous lever, le moment tant attendu est arrivé...*",
      "🎩 *Aujourd'hui, nous célébrons l'amour, la fidélité, l'engagement...*",
      "🎼 *Une douce mélodie accompagne les battements de cœur dans cette salle...*",
      "👰🏽‍♀️🤵🏾 *Les mariés entrent, main dans la main, portés par l'amour et les regards émerveillés...*",
      "🔔 *Les cloches du bonheur sonnent pour eux...*",
      "💐 *Mais aujourd’hui, j’aimerais parler d’un homme…*",
      "🧠 *Un esprit brillant, une âme bienveillante :*",
      "🧪 *Professeur Tournesol.*",
      "📚 *Scientifique reconnu, chercheur infatigable, il a exploré le monde avec sa loupe, son microscope, mais surtout avec son cœur.*",
      "🔬 *Des expériences chimiques aux inventions délirantes, il a toujours poursuivi une seule vérité : celle du savoir partagé.*",
      "👓 *Sous ses lunettes rondes se cache un regard tendre, souvent distrait, mais toujours juste.*",
      "💞 *Aujourd'hui, ce même regard est tourné vers celle qui a conquis son cœur.*",
      "🥹 *Et moi, son ami, je suis profondément ému.*",
      "👬 *Tournesol n’est pas seulement un savant, c’est un frère d’âme.*",
      "🍷 *Combien de fois avons-nous refait le monde, parlé d’étoiles, de molécules, et d’amour ?*",
      "💌 *Et maintenant, le voilà, prêt à écrire le plus beau chapitre de sa vie.*",
      "💍 *Il a trouvé celle qui comprend ses silences et partage ses rêves.*",
      "🎊 *Il lui a dit OUI, et nous, nous disons MERCI.*",
      "✨ *Merci à l’amour de le guider, de l’apaiser, de l’élever encore plus haut que la science.*",
      "🌈 *Aujourd’hui, Professeur Tournesol devient un mari. Et quel mari !*",
      "💖 *Fidèle, drôle sans le savoir, inventif, parfois confus, mais toujours sincère.*",
      "🌟 *Que cette union soit pleine de découvertes, de rires et d’émerveillement.*",
      "🫶 *Que vos disputes soient rares, vos réconciliations tendres, et vos projets illimités.*",
      "🥂 *Levez vos verres mes amis…*",
      "🎉 *À l’amour, à la science, à la folie douce du mariage !*",
      "👑 *Longue vie aux mariés !*",
      "🎊 *JOYEUX MARIAGE PROFESSEUR TOURNESOL !*"
    ];

    const sent = await riza.sendMessage(chat, { text: messages[0] }, { quoted: m });

    for (let i = 1; i < messages.length; i++) {
      await delay(2300); // plus de temps pour lire chaque phrase
      await riza.sendMessage(chat, {
        edit: sent.key,
        text: messages[i]
      });
    }
  }
};