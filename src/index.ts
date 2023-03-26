import { PrismaClient } from "@prisma/client";
import { CronJob } from "cron";
import Cryptr from "cryptr";
import * as dotenv from "dotenv";
import { createServer } from "http";
import isEmpty from "lodash.isempty";
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
const bogolCache = new NodeCache();
const cryptr = new Cryptr(process.env.SECRET_KEY as string);

const messages: Message[] = [];
const messageCacheKey = "messageCache";

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

io.on("connection", (socket) => {
  socket.on("loginUsername", async (arg) => {
    await prisma.user
      .findUnique({
        where: {
          username: arg,
        },
        select: { id: true },
      })
      .then((result) => {
        if (isEmpty(result)) {
          socket.emit("response", {
            message: "error",
            error: `There is no user ${arg}`,
          });
        }
        if (!isEmpty(result) && "id" in result) {
          const confirmationString = cryptr.encrypt(`${arg}-${result.id}`);
          bot
            .sendMessage(
              result.id,
              `https://make-rewind-great-again.netlify.app/confirm/${confirmationString}`
            )
            .then(() => socket.emit("response", "Login link has been sent"))
            .catch((error) =>
              socket.emit("response", { message: "error", error })
            );
        }
      });
  });
});

bot.onText(/\/rewind (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argument = match?.[1].split(" ")[0];
  const allMessages = bogolCache.get<Message[]>(messageCacheKey);

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
  if (msg && msg.from) {
    await prisma.user.upsert({
      where: { id: msg.from.id },
      update: {},
      create: {
        id: msg.from.id,
        username: msg.from.username ?? msg.from.first_name,
      },
    });
  }

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

  bogolCache.set(messageCacheKey, messages, 86400);
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
