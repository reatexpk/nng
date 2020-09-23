// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Marquee } from "dynamic-marquee";
import { MARQUEE_SPEED, SPACES_COUNT } from "../constants";

const messages: string[] = ["Тест 1", "Тест 2", "Тест 3"];

const marqueeDomNode = document.getElementById("marquee");
const marquee = new Marquee(marqueeDomNode, {
  rate: -MARQUEE_SPEED,
});

marquee.appendItem(createItem("initial message"));

marquee.onAllItemsRemoved(() => {
  marquee.appendItem(createContent(messages));
});

function createItem(text: string) {
  const newMessage = document.createElement("span");
  newMessage.textContent = text;
  return newMessage;
}

function createContent(currentMessages: string[]) {
  const container = document.createElement("span");
  currentMessages.forEach((message, index) => {
    let separator = "";
    if (index !== 0) {
      separator = generateSpaces(SPACES_COUNT);
    }
    container.textContent += `${separator}${message}`;
  });
  return container;
}

function generateSpaces(count: number) {
  return Array.from(new Array(count))
    .map(() => String.fromCharCode(160))
    .join("");
}
