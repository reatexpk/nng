/* eslint-disable no-console */
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

import { validateMessage } from "./validateMessage";

dotenv.config();
const { TOKEN } = process.env;
if (!TOKEN) {
  console.error("Missing bot token!");
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

bot.start((ctx) =>
  ctx.reply(
    "Привет! Сюда ты можешь отправить сообщение (без странных символов, эмодзи и на русском языке)" +
      " не длиннее 60 символов и оно появится на экране с клипами."
  )
);

bot.on("message", (ctx) => {
  if (!ctx.message) return;

  const valid = validateMessage(ctx.message);

  if (valid) {
    ctx.reply(`Ты прислал:\n${ctx.message.text}`);
  } else {
    ctx.reply("Ты прислал какую-то хуету");
  }
});

bot.launch().then(() => {
  console.log("Bot successfully launched on port 4000!");
});
