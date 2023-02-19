"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
var client_1 = require("@prisma/client");
var cron_1 = require("cron");
var token = process.env.TELEGRAM_TOKEN;
var bot = new node_telegram_bot_api_1.default(token, { polling: true });
var prisma = new client_1.PrismaClient();
var messageCache = [];
var arrayChangeHandler = {
    get: function (target, property) {
        if (target.length > 50)
            target.pop();
        return target[property];
    },
    set: function (target, property, value, receiver) {
        target[property] = value;
        return true;
    },
};
var cacheProxy = new Proxy(messageCache, arrayChangeHandler);
function normalizeMessage(message) {
    var _a, _b, _c;
    return {
        author: (_b = (_a = message.from) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : (_c = message.from) === null || _c === void 0 ? void 0 : _c.first_name,
        messageContent: message.text,
    };
}
bot.onText(/\/rewind (.+)/, function (msg, match) { return __awaiter(void 0, void 0, void 0, function () {
    var chatId, argument, messageRange, authorsArray, authors, content;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                chatId = msg.chat.id;
                argument = match === null || match === void 0 ? void 0 : match[1].split(" ")[0];
                if (!(!isNaN(Number(argument)) &&
                    Number(argument) <= cacheProxy.length &&
                    Number(argument) <= 50)) return [3 /*break*/, 2];
                messageRange = cacheProxy.slice(0, argument).reverse();
                console.log(messageRange);
                authorsArray = new Set(messageRange.map(function (message) { return message.author; }));
                authors = Array.from(authorsArray);
                content = JSON.stringify(messageRange);
                return [4 /*yield*/, prisma.rewind.create({
                        data: {
                            authors: authors,
                            content: content,
                        },
                    })];
            case 1:
                _a.sent();
                bot.sendMessage(chatId, "Some rewinds has been made 🗂️");
                return [3 /*break*/, 3];
            case 2:
                bot.sendMessage(chatId, "Invalid argument");
                _a.label = 3;
            case 3: return [2 /*return*/];
        }
    });
}); });
bot.on("message", function (msg) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (!msg.entities)
            cacheProxy.unshift(normalizeMessage(msg));
        console.log(cacheProxy);
        return [2 /*return*/];
    });
}); });
var wakeUpFn = function () {
    prisma.rewind.count();
    console.log("The database has been aroused");
};
var wakeUpJob = new cron_1.CronJob("0 12 * * 3", wakeUpFn, null, false, "Europe/London");
wakeUpJob.start();
