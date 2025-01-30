require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Tesseract = require("tesseract.js");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

let userData = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const keyboard = [
    [{ text: "Test yechish" }],
    [{ text: "Rasm orqali test yechish" }],
  ];
  
  bot.sendMessage(chatId, "Xush kelibsiz! Quyidagi tugmalardan birini tanlang.", {
    reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
  });
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (userMessage === "Test yechish") {
    bot.sendMessage(chatId, `Test savolini variantlari bilan birga yuboring (masalan: \n1. Choose the correct answer.
 My friends often go to ... cinema.
 A) the B)- C)a D)any
 2. Choose the correct answer.
 In Wales ... of children are adopted every year.
 A) hundred B) hundreds C) hundred’s
 D) hundreds’
 3. Choose the correct answer.
 . . . funds are limited, so each will probably pay
 half the cost of a new watch band.
 A) Their B) There C) They’re D) There’s)`);
    userData[chatId] = { testMode: true };
  } else if (userMessage === "Rasm orqali test yechish") {
    bot.sendMessage(chatId, "Iltimos, test savollari tushirilgan rasmni yuboring.");
    bot.sendPhoto(chatId, "./image.png", { caption: "📌 *Misol:* Oq fonda aniq ko‘rinadigan, test savollari va variantlari tushirilgan rasm." });
    userData[chatId] = { imageMode: true };
  } else if (userData[chatId]?.testMode) {
    userData[chatId].testQuestion = userMessage;
    try {
      const result = await model.generateContent(`Test savoli va variantlar: ${userData[chatId].testQuestion}`);
      const aiResponse = result.response.text();
      bot.sendMessage(chatId, `**Test natijasi**\n\nSavol:\n${userData[chatId].testQuestion}\n\n**Javob:**\n${aiResponse}`, { parse_mode: "Markdown" });

      // Testni yechib bo'lgandan so'ng, yangi tugmalarni yuborish
      const keyboard = [
        [{ text: "Test yechish" }],
        [{ text: "Rasm orqali test yechish" }],
      ];
      bot.sendMessage(chatId, "Yana biror testni ishkashni xohlaysizmi?", {
        reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
      });

      delete userData[chatId];
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "Xatolik yuz berdi, keyinroq urinib ko‘ring.");
    }
  }
});


bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  if (userData[chatId]?.imageMode) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);
    
    try {
      const { data: { text } } = await Tesseract.recognize(fileUrl, "eng");
      const result = await model.generateContent(`Bu matn ichidagi test savollarini aniqlab, javoblarini toping: ${text}`);
      const aiResponse = result.response.text();
      bot.sendMessage(chatId, `**Rasm asosida test natijasi**\n\n**Javob:**\n${aiResponse}`, { parse_mode: "Markdown" });
      delete userData[chatId];
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "Rasmni tahlil qilishda xatolik yuz berdi. Iltimos, boshqa rasm yuboring.");
    }const keyboard = [
      [{ text: "Test yechish" }],
      [{ text: "Rasm orqali test yechish" }],
    ];
    bot.sendMessage(chatId, "Yana biror testni ishkashni xohlaysizmi?", {
      reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true }
    });
  }
});

console.log("Bot ishga tushdi...");
