const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
return text === fault ? true : false;
}

module.exports = {
// Bot Basic Information
BOT_NAME: process.env.BOT_NAME || "Devil King",
OWNER_NAME: process.env.OWNER_NAME || "devil king",
OWNER_NUMBER: process.env.OWNER_NUMBER || "8586808398",

// Prefix aur Mode settings
PREFIX: process.env.PREFIX || ".",
MODE: process.env.MODE || "public", // public, private, ya inbox

// Session ID ya Connection settings
SESSION_ID: process.env.SESSION_ID || "",

// Auto features (Aap apne hisaab se true/false kar sakte hain)
AUTO_READ_STATUS: convertToBool(process.env.AUTO_READ_STATUS || "false"),
AUTO_BIO: convertToBool(process.env.AUTO_BIO || "false"),
MODE_STATUS: convertToBool(process.env.MODE_STATUS || "true"),
};
