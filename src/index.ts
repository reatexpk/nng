/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { Telegraf, Context } from "telegraf";
import dotenv from "dotenv";
import ws from "ws";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import path from "path";

import { validateMessage, getFullName, getTimeToWaitMessage } from "./helpers";
import {
  DELAY,
  INVALID_MESSAGE,
  LIMIT,
  START_MESSAGE,
  SUCCESS,
  UNEXPECTED_ERROR,
} from "./constants";
import { Post, Schema } from "./typings";

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

async function handler(ctx: Context) {
  try {
    if (!ctx.message || !ctx.message.from?.id) return;

    const timeToWait = await checkDelay(ctx.message.from.id);
    if (timeToWait === null) throw new Error("Unable to check delay");
    if (timeToWait > 0) {
      await ctx.reply(getTimeToWaitMessage(timeToWait));
      return;
    }

    const valid = validateMessage(ctx.message);

    if (valid && ctx.message.text) {
      const text = ctx.message.text.trim();
      let from = "";
      if (ctx.from) {
        from = getFullName(ctx.from);
      }
      // console.log(`Got message from ${from}:\n${text}`);
      try {
        const posts: Post[] = database.get("posts").value();
        if (posts.length >= LIMIT) {
          database.get("posts").shift().write();
          database.update("count", (count) => count - 1).write();
        }

        database
          .get("posts")
          .push({
            text,
            from,
            userId: ctx.message.from?.id || 0,
            timestamp: +new Date(),
          })
          .write();
        database.update("count", (count) => count + 1).write();
      } catch (e) {
        console.error(`Database update failed: ${e}`);
      }
      await ctx.reply(SUCCESS);
    } else {
      // console.log(
      //   `Got INVALID message from ${
      //     ctx.from ? getFullName(ctx.from) : "unknown user"
      //   }:\n${ctx.message.text}`
      // );
      await ctx.reply(INVALID_MESSAGE);
    }
  } catch (e) {
    console.log(e);
    await ctx.reply(UNEXPECTED_ERROR);
  }
}

async function checkDelay(userId: number) {
  try {
    const posts: Post[] = database.get("posts").value();
    const postsByUser = posts.filter((post) => post.userId === userId);
    if (!postsByUser.length) return 0;
    const currentTime = +new Date();
    const lastPostWithinAMinute = postsByUser
      .reverse()
      .find(({ timestamp }) => currentTime - timestamp <= 60000);
    if (lastPostWithinAMinute) {
      return (
        DELAY -
        Math.ceil((currentTime - lastPostWithinAMinute.timestamp) / 1000)
      );
    }
    return 0;
  } catch (e) {
    return null;
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

  botInstance.command("drop", async (ctx) => {
    const adminList = process.env.admins;
    const username = ctx.message?.from?.username;
    if (!username) return;
    if (adminList?.includes(username)) {
      await database.setState({ posts: [], count: 0 }).write();
      await ctx.reply("Посты очищены");
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
    const location = path.resolve(__dirname, "../database.json");
    const adapter = new FileSync<Schema>(location);
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