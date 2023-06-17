import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { CronJob } from "cron";
import * as dotenv from "dotenv";
import NodeCache from "node-cache";
import TelegramBot, { Message } from "node-telegram-bot-api";

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const token = process.env.TELEGRAM_TOKEN as string;

const bot = new TelegramBot(token, { polling: true });
const prisma = new PrismaClient();
const bogolCache = new NodeCache();

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

let globalID: number;

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  if (chatId) globalID = chatId;

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

async function fetchResumeInformation() {
  const prompt = "podaj ciekawostkę na temat Jana Pawła II";

  const data = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2048,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      data,
      { headers: headers }
    );
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

const aiResponse = fetchResumeInformation().then(
  (response) => response.choices[0].message.content
);

const getAiResponse = async () => {
  const response = await aiResponse;
  bot.sendMessage(globalID, response);
};

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
const popeJob = new CronJob(
  "37 20 * * *",
  getAiResponse,
  null,
  false,
  "Europe/London"
);

wakeUpJob.start();
popeJob.start();
