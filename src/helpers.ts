/* eslint-disable camelcase */
import { Context } from "telegraf";
import { TOO_FAST_MESSAGE } from "./constants";

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

export function getTimeToWaitMessage(seconds: number): string {
  return `${TOO_FAST_MESSAGE} ${seconds} ${decline(seconds, [
    "секунду",
    "секунды",
    "секунд",
  ])}`;
}

export function validateMessage(message: Context["message"]): boolean {
  if (!message || !message.text) return false;
  return message.text.length <= 60;
}

function decline(value: number, titles: [string, string, string]) {
  const target = Math.abs(value);
  const cases = [2, 0, 1, 1, 1, 2];
  const caseIndex =
    target % 100 > 4 && target % 100 < 20
      ? 2
      : cases[target % 10 < 5 ? target % 10 : 5];
  return titles[caseIndex];
}
