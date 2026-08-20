require("dotenv").config();
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const P = require("pino");
const readline = require("readline");
const qrcode = require("qrcode-terminal");

const PREFIX = ".";
const SESSION_DIR = "./session";

// Bot identity
const BOT_NAME = "DEVIL KING";
const OWNER_NUMBER = "+918586808398";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function getQuotedMessage(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function getQuotedKey(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.stanzaId || !ctx?.participant) return null;
  return {
    remoteJid: msg.key.remoteJid,
    fromMe: false,
    id: ctx.stanzaId,
    participant: ctx.participant
  };
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    browser: [BOT_NAME, "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nScan this QR code with WhatsApp > Linked devices:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log(`\n✅ ${BOT_NAME} connected successfully!`);
      console.log("Use .menu in WhatsApp to see commands.\n");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("❌ Connection closed.", shouldReconnect ? "Reconnecting..." : "Logged out.");

      if (shouldReconnect) {
        setTimeout(startBot, 3000);
      } else {
        console.log("Delete the session folder and start again to pair a new account.");
      }
    }
  });

  const warnedUsers = new Set();

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid || jid === "status@broadcast") return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      "";

    const lower = text.toLowerCase();

    // Group moderation: links, common explicit-content keywords, and media.
    if (jid.endsWith("@g.us")) {
      const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|t\.me\/|instagram\.com\/|facebook\.com\/|youtube\.com\/)/i.test(text);
      const explicit = /\b(porn|porno|xxx|sex\s*video|nude|naked|nsfw)\b/i.test(text);
      const isMedia = !!(
        msg.message.imageMessage ||
        msg.message.videoMessage ||
        msg.message.audioMessage ||
        msg.message.documentMessage
      );

      if (hasLink || explicit) {
        try {
          await sock.sendMessage(jid, {
            text: hasLink
              ? "⚠️ LINK NOT ALLOWED\nPlease don't send links in this group."
              : "⚠️ EXPLICIT CONTENT NOT ALLOWED\nPlease keep this group safe."
          }, { quoted: msg });

          // Delete the offending message. Bot needs admin privileges.
          await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});

          const user = msg.key.participant || msg.participant || msg.key.remoteJid;
          if (!warnedUsers.has(`${jid}:${user}`)) {
            warnedUsers.add(`${jid}:${user}`);
            await sock.sendMessage(jid, {
              text: `⚠️ Warning: @${(user || "").split("@")[0]}\nPlease follow group rules.`,
              mentions: user ? [user] : []
            });
          }
        } catch (e) {
          console.error("Moderation error:", e.message);
        }
        return;
      }

      // Optional media restriction can be enabled by changing this flag to true.
      const BLOCK_MEDIA = false;
      if (BLOCK_MEDIA && isMedia) {
        await sock.sendMessage(jid, {
          text: "🚫 Image/video/audio/document messages are not allowed here."
        }).catch(() => {});
        await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
        return;
      }
    }

    if (!text.startsWith(PREFIX)) return;

    const parts = text.slice(PREFIX.length).trim().split(/\s+/);
    const command = (parts.shift() || "").toLowerCase();
    const args = parts.join(" ");

    try {
      switch (command) {
        case "menu":
        case "help":
          await sock.sendMessage(jid, {
            text:
`╭───〔 👑 DEVIL KING 〕───
│
│ ⚡ .ping
│ ❤️ .alive
│ 📋 .menu
│
│ 🛡️ GROUP MODERATION
│ 🔗 .antilink on/off
│ 🚫 .antimedia on/off
│ 👋 .welcome on/off
│
│ 🕌 ISLAMIC
│ 🤲 .dua
│ 🌙 .salam
│ ☪️ .astaghfar
│ 📖 .yasin
│ 🕋 .kalma
│
│ 🤖 AI / REACTION
│ 🤖 .ai <text>
│ 🔊 .aivoice <text>
│ ❤️ .react <emoji>
│ ❤️ .reactall <emoji>
│
│ 🎭 FUN
│ 🤗 .hug @user
│ 😘 .kiss @user
│ 👢 .kick @user
│ ➕ .add 919876543210
│
╰────────────────────────
Owner: +918586808398`
          });
          break;

        case "ping":
          await sock.sendMessage(jid, { text: "🏓 Pong! DEVIL KING is online." });
          break;

        case "alive":
          await sock.sendMessage(jid, {
            text: "❤️ DEVIL KING is alive!\n⚡ Status: Online\n👑 Owner: +918586808398"
          });
          break;

        case "salam":
          await sock.sendMessage(jid, {
            text: "السلام عليكم ورحمة الله وبركاته 🌙🤲"
          });
          break;

        case "dua":
          await sock.sendMessage(jid, {
            text: "🤲 رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ\n\nاے ہمارے رب! ہمیں دنیا میں بھلائی دے، آخرت میں بھی بھلائی دے اور ہمیں جہنم کے عذاب سے بچا۔"
          });
          break;

        case "astaghfar":
        case "astagfirullah":
          await sock.sendMessage(jid, {
            text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ 🤲\n\nAstaghfirullaha wa atubu ilaih."
          });
          break;

        case "kalma":
          await sock.sendMessage(jid, {
            text: "☪️ کلمۂ طیبہ\n\nلَا إِلٰهَ إِلَّا اللّٰهُ مُحَمَّدٌ رَسُولُ اللّٰهِ\n\nLa ilaha illallahu Muhammadur Rasulullah ﷺ"
          });
          break;

        case "yasin":
          await sock.sendMessage(jid, {
            text: "📖 سورۃ یٰسین\n\nاس کمانڈ میں مکمل سورۃ یٰسین شامل نہیں کی گئی تاکہ عربی متن میں نقل کی غلطی نہ ہو۔ معتبر قرآن ایپ/مصحف سے سورۃ یٰسین پڑھیں۔ 🤲"
          });
          break;

        case "react":
          {
            const quotedKey = getQuotedKey(msg);
            if (!quotedKey) {
              await sock.sendMessage(jid, { text: "❤️ کسی message کو reply کرکے .react ❤️ استعمال کریں۔" });
              break;
            }
            const emoji = args || "❤️";
            await sock.sendMessage(jid, {
              react: { text: emoji, key: quotedKey }
            });
          }
          break;

        case "reactall":
          {
            const emoji = args || "❤️";
            await sock.sendMessage(jid, {
              text: `❤️ DEVIL KING reaction mode: ${emoji}\nReply to a message and use .react ${emoji} to react.`
            });
          }
          break;

        case "ai":
          await sock.sendMessage(jid, {
            text: "🤖 AI Assistant ready!\n\nAI API connect karne ke baad .ai <your question> se real AI reply milega.\n\nExample: .ai What is an API?"
          });
          break;

        case "aivoice":
          await sock.sendMessage(jid, {
            text: "🔊 AI Voice Assistant ready!\n\nVoice API/TTS provider configure karne ke baad .aivoice <text> se voice message generate hoga."
          });
          break;

        case "hug":
          await sock.sendMessage(jid, {
            text: args ? `🤗 DEVIL KING hugs ${args} ❤️` : "🤗 Send/tag someone to hug!"
          });
          break;

        case "kiss":
          await sock.sendMessage(jid, {
            text: args ? `😘 DEVIL KING sends a friendly kiss to ${args} 💋` : "😘 Send/tag someone!"
          });
          break;

        case "add":
          if (!jid.endsWith("@g.us")) {
            await sock.sendMessage(jid, { text: "❌ .add only works in groups." });
            break;
          }
          {
            const numbers = args.split(/[\\s,]+/).filter(Boolean);
            if (!numbers.length) {
              await sock.sendMessage(jid, { text: "❌ Usage: .add 919876543210" });
              break;
            }

            const group = await sock.groupMetadata(jid);
            const botId = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
            const botAdmin = group.participants.some(x =>
              x.id === botId && ["admin", "superadmin"].includes(x.admin)
            );

            if (!botAdmin) {
              await sock.sendMessage(jid, { text: "❌ Make DEVIL KING an admin first." });
              break;
            }

            const targets = numbers.map(n => {
              const clean = n.replace(/[^0-9]/g, "");
              return clean ? `${clean}@s.whatsapp.net` : null;
            }).filter(Boolean);

            try {
              const result = await sock.groupParticipantsUpdate(jid, targets, "add");
              const lines = result.map(x =>
                `${x.jid?.split("@")[0] || "number"}: ${x.status || "processed"}`
              );
              await sock.sendMessage(jid, {
                text: `➕ Add request processed.\\n\\n${lines.join("\\n")}`
              });
            } catch (e) {
              await sock.sendMessage(jid, {
                text: "⚠️ Couldn't add the number(s). The user may have privacy restrictions or WhatsApp may require an invite instead."
              });
            }
          }
          break;

        case "kick":
          if (!jid.endsWith("@g.us")) {
            await sock.sendMessage(jid, { text: "❌ This command only works in groups." });
            break;
          }
          {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (!mentioned.length) {
              await sock.sendMessage(jid, { text: "❌ Tag the member you want to remove." });
              break;
            }
            const group = await sock.groupMetadata(jid);
            const botId = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
            const botAdmin = group.participants.some(x =>
              x.id === botId && ["admin", "superadmin"].includes(x.admin)
            );
            if (!botAdmin) {
              await sock.sendMessage(jid, { text: "❌ Make DEVIL KING an admin first." });
              break;
            }
            await sock.groupParticipantsUpdate(jid, mentioned, "remove");
            await sock.sendMessage(jid, { text: "👢 Member removed by DEVIL KING." });
          }
          break;

        case "welcome":
          await sock.sendMessage(jid, {
            text: "👋 Welcome feature command received. Automatic welcome requires storing group settings; this starter keeps it simple."
          });
          break;

        case "antilink":
          await sock.sendMessage(jid, {
            text: "🛡️ Anti-link protection is active in this version.\nLinks are warned and deleted in groups."
          });
          break;

        case "antimedia":
          await sock.sendMessage(jid, {
            text: "🎞️ Anti-media is currently OFF in code.\nSet BLOCK_MEDIA = true in index.js to block image/video/audio/document messages."
          });
          break;

        default:
          await sock.sendMessage(jid, {
            text: `❌ Unknown command: ${PREFIX}${command}\n\nType ${PREFIX}menu`
          });
      }
    } catch (err) {
      console.error("Command error:", err);
      await sock.sendMessage(jid, {
        text: "⚠️ Something went wrong while processing that command."
      }).catch(() => {});
    }
  });
}

startBot().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
        
