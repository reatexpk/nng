/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { Telegraf, Context } from "telegraf";
import dotenv from "dotenv";
import ws from "ws";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";
import path from "path";

import {
  validateMessage,
  getFullName,
  getTimeToWaitMessage,
  isAdmin,
} from "./helpers";
import {
  DELAY,
  INVALID_MESSAGE,
  LIMIT,
  START_MESSAGE,
  SUCCESS,
  UNEXPECTED_ERROR,
  WS_PORT,
} from "./constants";
import { Post, Schema } from "./typings";

dotenv.config();
const database = initDatabase();
const bot = initBot();
const server = new ws.Server({
  port: WS_PORT,
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

    const bannedUsers = database.get("bannedUsers").value();
    const username = ctx.message.from?.username;
    if (username && bannedUsers.includes(`@${username}`)) {
      ctx.reply("Ты был забанен :(");
      return;
    }

    const timeToWait = await checkDelay(ctx.message.from.id, ctx);
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

        server.clients.forEach((client) => {
          if (client.readyState === ws.OPEN) {
            client.send(preparePostsBeforeSend(database.get("posts").value()));
          }
        });
        await ctx.reply(SUCCESS);
      } catch (e) {
        console.error(`Database update failed: ${e}`);
      }
    } else {
      await ctx.reply(INVALID_MESSAGE);
    }
  } catch (e) {
    console.log(e);
    await ctx.reply(UNEXPECTED_ERROR);
  }
}

async function checkDelay(userId: number, ctx: Context) {
  try {
    if (isAdmin(ctx)) return 0;
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

  botInstance.command("stats", (ctx) => {
    const { posts, count } = database.getState();
    const posters = [...new Set(posts.map(({ from }) => from))].length;
    const message = `Отправлено сообщений: ${count}\nПостеров: ${posters}`;
    ctx.reply(message);
  });

  botInstance.command("drop", async (ctx) => {
    if (isAdmin(ctx)) {
      database.setState({ posts: [], count: 0, bannedUsers: [] }).write();
      server.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify([]));
        }
      });
      ctx.reply("Посты очищены");
    }
  });

  botInstance.command("kill", (ctx) => {
    if (!ctx.message?.text) return;
    if (isAdmin(ctx)) {
      const username = ctx.message.text.split(" ")[1];
      database
        .get("posts")
        .remove((post) => post.from.includes(username))
        .value();
      const newPosts = database.get("posts").value();
      server.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(preparePostsBeforeSend(newPosts));
        }
      });
      database.set("count", newPosts.length).write();
      ctx.reply(`Все посты пользователя ${username} удалены`);
    }
  });

  botInstance.command("ban", (ctx) => {
    if (!ctx.message?.text) return;
    if (isAdmin(ctx)) {
      const username = ctx.message.text.split(" ")[1];
      database
        .get("posts")
        .remove((post) => post.from.includes(username))
        .value();
      const newPosts = database.get("posts").value();
      if (currentSocket) {
        currentSocket.send(preparePostsBeforeSend(newPosts));
      }
      database.set("count", newPosts.length).write();
      database.get("bannedUsers").push(username).write();
      ctx.reply(`Пользователь ${username} забанен`);
    }
  });

  botInstance.command("unban", (ctx) => {
    if (!ctx.message?.text) return;
    if (isAdmin(ctx)) {
      const username = ctx.message.text.split(" ")[1];
      database
        .get("bannedUsers")
        .remove((user) => user !== `@${username}`)
        .value();
      ctx.reply(`Пользователь ${username} разбанен`);
    }
  });

  return botInstance;
}

function initDatabase() {
  try {
    const location = path.resolve(__dirname, "../database.json");
    const adapter = new FileSync<Schema>(location);
    const databaseInstance = low(adapter);
    databaseInstance.defaults({ posts: [], count: 0, bannedUsers: [] }).write();
    return databaseInstance;
  } catch (e) {
    console.log("An error occured during initiating database");
    throw new Error("An error occured during initiating database");
  }
}

server.on("connection", (socket) => {
  socket.on("message", (data) => {
    if (data === "get") {
      const posts = database
        .get("posts")
        .value()
        .map(({ text }) => text);
      socket.send(JSON.stringify(posts));
    }
  });
});

function preparePostsBeforeSend(posts: Post[]) {
  return JSON.stringify(posts.map((post) => post.text));
}
