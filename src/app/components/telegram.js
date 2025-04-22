import axios from "axios";

export const sendTelegramMessage = async (message) => {
  const token = "8124642164:AAGz7kbPgvKouGrrn5YvGKZixzgi64J27og";
  const chatId = "199753805";

  if (!token || !chatId) {
    console.warn("Telegram credentials missing");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("❌ Error sending Telegram message:", error);
  }
};
