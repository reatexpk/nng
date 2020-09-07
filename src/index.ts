/* eslint-disable no-console */
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();
const { TOKEN } = process.env;
if (!TOKEN) {
  console.error("Missing bot token!");
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

bot.start((ctx) => ctx.reply("Welcome!"));
bot.launch().then(() => {
  console.log("Bot successfully launched on port 4000!");
});
