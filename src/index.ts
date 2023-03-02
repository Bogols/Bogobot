import TelegramBot from "node-telegram-bot-api";
import { PrismaClient } from "@prisma/client";
import { CronJob } from "cron";

const token = process.env.TELEGRAM_TOKEN as string;

const bot = new TelegramBot(token, { polling: true });

const prisma = new PrismaClient();

bot.onText(/\/rewind (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argument = match?.[1].split(" ")[0];
  const allMessages = await prisma.message.findMany().then((result) => result);

  if (isNaN(Number(argument))) {
    await bot.sendMessage(chatId, "Something is not yes 🤔 - argument");
    return;
  }

  if (Number(argument) <= allMessages.length && Number(argument) <= 50) {
    const newRewind = allMessages.reverse().slice(0, Number(argument));
    const rewindAuthors = new Set(newRewind.map((rewind) => rewind.author));
    const authors = Array.from(rewindAuthors);
    await prisma.rewind
      .create({
        data: {
          authors,
          messages: newRewind.map((message) => JSON.stringify(message)),
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
  if (msg.text?.startsWith("/rewind")) return;

  if (msg.text && msg.chat.title && msg.from)
    await prisma.message.create({
      data: {
        author: msg.from?.username ?? msg.from?.first_name,
        content: msg.text,
        chatName: msg.chat.title,
        createdAt: new Date().toISOString(),
      },
    });

  prisma.message.count().then((messageCount) => {
    if (messageCount > 50) {
      prisma.message.findMany().then(async (returnedMessages) => {
        returnedMessages.sort((a, b) => Number(a.id) - Number(b.id));
        await prisma.message.delete({
          where: {
            id: returnedMessages[0].id,
          },
        });
      });
    }
  });
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
