/* eslint-disable camelcase */
import { Context } from "telegraf";

interface From {
  first_name: string;
  last_name?: string;
  username?: string;
}

export function getFullName(from: From): string {
  const { first_name: firstName, last_name, username } = from;
  const lastName = last_name || "";
  const nickname = `(@${username})` || "";
  return `${firstName} ${lastName ? `${lastName} ` : ""}${nickname || ""}`;
}

export function validateMessage(message: Context["message"]): boolean {
  if (!message || !message.text) return false;

  if (message.text.length > 60) return false;

  const regexp = /[^а-яё\d.,!?:_\-–=+*&@#%\s]/gi;
  return !regexp.test(message.text);
}
