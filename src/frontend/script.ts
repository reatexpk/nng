// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Marquee } from "dynamic-marquee";
import { MARQUEE_SPEED, SPACES_COUNT, WS_PORT } from "../constants";

let messages: string[] = [];

const marqueeDomNode = document.getElementById("marquee");
const marquee = new Marquee(marqueeDomNode, {
  rate: -MARQUEE_SPEED,
});

marquee.onAllItemsRemoved(() => {
  marquee.appendItem(createContent(messages));
});

const ws = new WebSocket(`ws://5.63.155.197:${WS_PORT}`);

ws.onopen = () => {
  ws.send("get");
};

ws.onmessage = (event: MessageEvent<string>) => {
  const posts = JSON.parse(event.data);
  const firstInit = messages.length === 0;
  messages = posts;
  if (firstInit && marquee.getNumItems() === 0) {
    marquee.appendItem(createContent(messages));
  }
};

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
