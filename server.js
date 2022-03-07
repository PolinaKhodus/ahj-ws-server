/* eslint-disable no-console */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */
const http = require("http");
const Koa = require("koa");
const Router = require("koa-router");
const cors = require("koa2-cors");
const koaBody = require("koa-body");
const WS = require("ws");
const User = require("./User");
const Message = require("./Message");

const app = new Koa();
app.use(cors({
  origin: "*",
  credentials: true,
  "Access-Control-Allow-Origin": true,
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(koaBody({
  urlencoded: true,
  multipart: true,
  text: true,
  json: true,
}));

const users = ["oleg", "Max"];
const messages = [
  new Message("Oleg", "I am first"),
  new Message("Max", "I am second"),
];

const router = new Router();

app.use(router.routes()).use(router.allowedMethods());
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

wsServer.on("connection", (ws, req) => {
  const errCallback = (err) => {
    if (err) {
      ws.send(JSON.stringify({ type: "error", text: "что-то пошло не так" }));
    }
  };

  ws.on("message", (message) => {
    const body = JSON.parse(message);

    if (body.type === "login") {
      if (users.includes(body.value)) {
        ws.send(JSON.stringify({ type: "error", text: "Этот псевдоним занят, выберите другой" }));
      } else {
        users.push(body.value);
        const response = {
          type: "users",
          users,
        };
        ws.send(JSON.stringify(response));
        if (messages) {
          const response = {
            type: "messages",
            messages,
          };
          ws.send(JSON.stringify(response));
        }
      }
    }

    if (body.type === "newMessage") {
      messages.push(new Message(body.user, body.value));
      const response = {
        type: "messages",
        messages,
      };
      ws.send(JSON.stringify(response));
      [...wsServer.clients]
        .filter((c) => c.readyState === WS.OPEN)
        .forEach((c) => c.send(JSON.stringify(response)));
    }
  });

  ws.on("close", () => {
    const user = users.findIndex((ele) => ele.name === ws.name);
    if (user !== -1) {
      users.splice(user, 1);

      const response = {
        type: "disconnect",
        users,
      };
      [...wsServer.clients]
        .filter((c) => c.readyState === WS.OPEN)
        .forEach((c) => c.send(JSON.stringify(response)));
    }
  });
});

const port = process.env.PORT || 7070;
server.listen(port, () => console.log("server started"));
