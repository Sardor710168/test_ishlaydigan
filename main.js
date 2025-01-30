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

const keyboard = [
  [ { text: "Savol so‘rash" },{ text: "Test tuzish" }],
  [{ text: "Test yechish" }, { text: "Rasm orqali test yechish" }],
];

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Xush kelibsiz! Quyidagi tugmalardan birini tanlang.", {
    reply_markup: { keyboard, resize_keyboard: true }
  });
});

bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userMessage = msg.text;

    if (userMessage === "Test yechish") {
      bot.sendMessage(chatId, ` Test savolini variantlari bilan birga yuboring (masalan: \n1. Choose the correct answer.
 My friends often go to ... cinema.
 A) the B)- C)a D)any\n
 2. Choose the correct answer.
 In Wales ... of children are adopted every year.
 A) hundred B) hundreds C) hundred’s
 D) hundreds’\n
 3. Choose the correct answer.
 . . . funds are limited, so each will probably pay
 half the cost of a new watch band.
 A) Their B) There C) They’re D) There’s).`);
      userData[chatId] = { testMode: true };
    } else if (userMessage === "Rasm orqali test yechish") {
      bot.sendMessage(chatId, "Iltimos, test savollari tushirilgan rasmni yuboring.");
      bot.sendPhoto(chatId, "./image.png", { caption: "📌 *Misol:* Oq fonda aniq ko‘rinadigan, test savollari va variantlari tushirilgan rasm." });
      userData[chatId] = { imageMode: true };
    } else if (userMessage === "Test tuzish") {
      bot.sendMessage(chatId, "Qaysi fandan nechta test tuzishni xohlaysiz?");
      userData[chatId] = { testCreationMode: true };
    } else if (userMessage === "Savol so‘rash") {
      bot.sendMessage(chatId, "O‘zingiz qiziqqan savolni yozing, men javob beraman (ChatGpt).");
      userData[chatId] = { questionMode: true };
    } else if (userData[chatId]?.testCreationMode) {
      userData[chatId].subject = userMessage;
      const result = await model.generateContent(`Iltimos, ${userData[chatId].subject} savoli variantlari bilan tuzing.`);
      const aiResponse = result.response.text();
      bot.sendMessage(chatId, `**Test tuzildi**\n\nFan: ${userData[chatId].subject}\n\n${aiResponse}`, {
        reply_markup: { keyboard, resize_keyboard: true }
      }, { parse_mode: "Markdown" });
    } else if (userData[chatId]?.testMode) {
      userData[chatId].testQuestion = userMessage;
      const result = await model.generateContent(`Test savoli va variantlar: ${userData[chatId].testQuestion}`);
      const aiResponse = result.response.text();
      bot.sendMessage(chatId, `**Test natijasi**\n\nSavol:\n${userData[chatId].testQuestion}\n\n**Javob:**\n${aiResponse}`, {
        reply_markup: { keyboard, resize_keyboard: true }
      }, { parse_mode: "Markdown" });
    } else if (userData[chatId]?.questionMode) {
      userData[chatId].question = userMessage;
      const result = await model.generateContent(`Savol: ${userData[chatId].question}. Iltimos, aniq va tushunarli javob bering.`);
      const aiResponse = (result.response.text());
      bot.sendMessage(chatId, `**Javob:**\n\n${aiResponse} \n\nYana savolingiz bolsa marhamat javob berishga tayyorman`, {
        reply_markup: { keyboard, resize_keyboard: true }
      }, { parse_mode: "Markdown" });
    }
    
  } catch (error) {
    console.error("Xatolik yuz berdi:", error.message);
  }
});

bot.on("photo", async (msg) => {
  try {
    const chatId = msg.chat.id;
    if (userData[chatId]?.imageMode) {
      if (!msg.photo) {
        bot.sendMessage(chatId, "Iltimos, faqat rasm yuboring.");
        return;
      }
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const fileUrl = await bot.getFileLink(fileId);
      
      const { data: { text } } = await Tesseract.recognize(fileUrl, "eng");
      const result = await model.generateContent(`Bu matn ichidagi test savollarini aniqlab, javoblarini toping: ${text}`);
      const aiResponse = result.response.text();
      bot.sendMessage(chatId, `**Rasm asosida test natijasi**\n\n**Javob:**\n${aiResponse}`,  {
        reply_markup: { keyboard, resize_keyboard: true }
      },{ parse_mode: "Markdown" });
    }
    
  } catch (error) {
    console.error("Rasmni tahlil qilishda xatolik yuz berdi:", error.message);
    bot.sendMessage(chatId, "Rasmni tahlil qilishda xatolik yuz berdi. Iltimos, boshqa rasm yuboring.");
  }
});

console.log("Bot ishga tushdi...");
