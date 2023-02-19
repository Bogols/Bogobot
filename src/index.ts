import TelegramBot, { Message } from "node-telegram-bot-api";
import { PrismaClient } from "@prisma/client";
import { CronJob } from "cron";

const token = process.env.TELEGRAM_TOKEN as string;

const bot = new TelegramBot(token, { polling: true });

const prisma = new PrismaClient();

const messageCache: { [key: string]: string | undefined }[] = [];

const arrayChangeHandler = {
  get: function (target: any, property: any) {
    if (target.length > 50) target.pop();

    return target[property];
  },
  set: function (target: any, property: any, value: any, receiver: any) {
    target[property] = value;
    return true;
  },
};

const cacheProxy = new Proxy(messageCache, arrayChangeHandler);
function normalizeMessage(message: Message) {
  return {
    author: message.from?.username ?? message.from?.first_name,
    messageContent: message.text,
  };
}

bot.onText(/\/rewind (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argument = match?.[1].split(" ")[0];

  if (
    !isNaN(Number(argument)) &&
    Number(argument) <= cacheProxy.length &&
    Number(argument) <= 50
  ) {
    const messageRange = cacheProxy.slice(0, argument).reverse();

    const authorsArray = new Set(
      messageRange.map((message: any) => message.author)
    );
    const authors = Array.from(authorsArray) as string[];
    const content = JSON.stringify(messageRange);

    await prisma.rewind.create({
      data: {
        authors,
        content,
      },
    });
    bot.sendMessage(chatId, "Some rewinds has been made 🗂️");
  } else {
    bot.sendMessage(chatId, "Invalid argument");
  }

  // send back the matched "whatever" to the chat
  // bot.sendMessage(chatId, resp);
});

bot.on("message", async (msg) => {
  if (!msg.entities) cacheProxy.unshift(normalizeMessage(msg));
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
