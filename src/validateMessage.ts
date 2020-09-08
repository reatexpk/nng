import { Context } from "telegraf";

export function validateMessage(message: Context["message"]): boolean {
  if (!message || !message.text) return false;

  if (message.text.length > 60) return false;

  const regexp = /[^а-яё\d.,!?:_\-–=+*&@#%\s]/gi;
  if (regexp.test(message.text)) return false;

  return true;
}
