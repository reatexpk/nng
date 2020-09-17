/* eslint-disable no-console, no-use-before-define */
import { Telegraf, Context } from "telegraf";
import dotenv from "dotenv";
import ws from "ws";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";

import { validateMessage, getFullName } from "./helpers";
import {
  INVALID_MESSAGE,
  START_MESSAGE,
  SUCCESS,
  UNEXPECTED_ERROR,
} from "./constants";
import { Schema } from "./typings";

dotenv.config();
const database = initDatabase();
const bot = initBot();
const server = new ws.Server({
  port: 3002,
});

bot.on("message", handler);

bot
  .launch()
  .then(() => {
    console.log("Bot successfully launched on port 4000!");
  })
  .catch((e) => {
    console.error(`Failed to start bot instance: ${e}`);
  });

function handler(ctx: Context) {
  try {
    if (!ctx.message) return;

    const valid = validateMessage(ctx.message);

    if (valid && ctx.message.text) {
      const text = ctx.message.text.trim();
      let from = "";
      if (ctx.from) {
        from = getFullName(ctx.from);
      }
      console.log(`Got message from ${from}:\n${text}`);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (database.get("posts") as any)
          .push({
            text,
            from,
            timestamp: +new Date(),
          })
          .write();
        database.update("count", (count) => count + 1).write();
      } catch (e) {
        console.error(`Database update failed: ${e}`);
      }
      ctx.reply(SUCCESS);
    } else {
      ctx.reply(INVALID_MESSAGE);
    }
  } catch (e) {
    ctx.reply(UNEXPECTED_ERROR);
  }
}

function initBot() {
  const { TOKEN } = process.env;
  if (!TOKEN) {
    console.error("Missing bot token!");
    process.exit(1);
  }

  const botInstance = new Telegraf(TOKEN);
  botInstance.start((ctx) => ctx.reply(START_MESSAGE));

  botInstance.command("get", () => {
    const { posts } = database.getState();
    console.log(posts);
  });

  botInstance.command("stats", (ctx) => {
    const { posts, count } = database.getState();
    const posters = [...new Set(posts.map(({ from }) => from))].length;
    const message = `Отправлено сообщений: ${count}\nПостеров: ${posters}`;
    console.log(message);
    ctx.reply(message);
  });

  botInstance.command("drop", (ctx) => {
    const adminList = process.env.admins;
    const username = ctx.message?.from?.username;
    if (!username) return;
    if (adminList?.includes(username)) {
      database.setState({ posts: [], count: 0 });
      ctx.reply("Посты очищены");
    }
  });

  botInstance.command("dropLast", (ctx) => {
    const adminList = process.env.admins;
    const username = ctx.message?.from?.username;
    if (!username) return;
    if (adminList?.includes(username)) {
      database.setState({ posts: [], count: 0 });
      ctx.reply("Последний пост удален");
    }
  });

  return botInstance;
}

function initDatabase() {
  try {
    const adapter = new FileSync<Schema>("database.json");
    const databaseInstance = low(adapter);
    databaseInstance.defaults({ posts: [], count: 0 }).write();
    return databaseInstance;
  } catch (e) {
    console.log("An error occured during initiating database");
    throw new Error("An error occured during initiating database");
  }
}

server.on("connection", (socket) => {
  socket.on("message", (data) => {
    console.log(data);
  });
});
