import express from "express";
import path from "path";

const app = express();
const port = 80;

app.use("/", express.static(path.join(__dirname, "/../../dist/")));

app.get("/", (req, res) => {
  res.sendFile(path.join(`${__dirname}/../../dist/index.html`));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Frontend listening at http://localhost:${port}`);
});
