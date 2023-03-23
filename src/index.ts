import { PrismaClient } from "@prisma/client";
import { CronJob } from "cron";
import * as dotenv from "dotenv";
import { createServer } from "http";
import NodeCache from "node-cache";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { Server } from "socket.io";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const token = process.env.TELEGRAM_TOKEN as string;

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

httpServer.listen(2137);

const bot = new TelegramBot(token, { polling: true });
const prisma = new PrismaClient();
const messageCache = new NodeCache();

const messages: Message[] = [];
const messageCacheKey = "messageCache";

io.on("connection", (socket) => socket.emit("hello", "world"));

function checkMessagePreCacheLength<T>(cache: T[]): Promise<number> {
  return new Promise((resolve, reject) => {
    if (cache) {
      resolve(cache.length);
    } else {
      reject(new Error("Invalid data"));
    }
  });
}

function addMessage(data: Message) {
  return new Promise((resolve, reject) => {
    if (data) {
      messages.push(data);
      resolve(data);
    } else {
      reject(new Error("Invalid data"));
    }
  });
}

bot.onText(/\/rewind (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argument = match?.[1].split(" ")[0];
  const allMessages = messageCache.get<Message[]>(messageCacheKey);

  if (isNaN(Number(argument))) {
    await bot.sendMessage(chatId, "Something is not yes 🤔 - argument");
    return;
  }

  if (!allMessages) {
    await bot.sendMessage(chatId, "Message cache is empty");
    return;
  }

  if (Number(argument) <= allMessages.length && Number(argument) <= 50) {
    const messagesToRewind = allMessages
      .reverse()
      .slice(0, Number(argument))
      .map((message) => {
        return {
          id: message.message_id,
          content: message.text,
          author: message.from?.username ?? message.from?.first_name,
          chat: message.chat.title,
          chatId: message.chat.id,
        };
      });
    const rewindAuthors = new Set(
      messagesToRewind.map((message) => message.author ?? "Unknown author")
    );
    const authors = Array.from(rewindAuthors);
    await prisma.rewind
      .create({
        data: {
          authors: authors,
          messages: messagesToRewind
            .reverse()
            .map((message) => JSON.stringify(message)),
        },
      })
      .then(() => {
        bot.sendMessage(chatId, "Some rewinds has been made 🗂️");
      })
      .catch((error) => {
        bot.sendMessage(chatId, "Something is not yes 🤔 - create rewind");
        bot.sendMessage(chatId, error);
      });
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text?.startsWith("/rewind")) return;

  await addMessage(msg);
  await checkMessagePreCacheLength(messages)
    .then((messageCount) => {
      if (messageCount >= 50) {
        messages.shift();
      }
    })
    .catch((error) => {
      bot.sendMessage(chatId, "Something is not yes 🤔 - create rewind");
      bot.sendMessage(chatId, error);
    });

  messageCache.set(messageCacheKey, messages, 86400);
});

const wakeUpFn = () => {
  prisma.rewind.count();
  console.log("The database has been aroused");
};

const wakeUpJob = new CronJob(
  "0 12 * * 3",
  wakeUpFn,
  null,
  false,
  "Europe/London"
);

wakeUpJob.start();
