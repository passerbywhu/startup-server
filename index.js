const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Counter } = require("./db");
const WebSocket = require("ws");

const router = new Router();
const app = new Koa();
const server = app.listen(process.env.PORT || 80);
const wss = new WebSocket.Server({ server, path: '/ws' });

// WebSocket连接处理
wss.on('connection', function connection(ws) {
  console.log('新的WebSocket连接已建立');

  ws.on('message', function incoming(message) {
    console.log('收到消息: %s', message);
    // 回复消息
    ws.send(`收到: ${message}`);
  });

  ws.on('close', () => {
    console.log('WebSocket连接已关闭');
  });
});

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");

// 首页
router.get("/", async (ctx) => {
  ctx.body = homePage;
});

// 更新计数
router.post("/api/count", async (ctx) => {
  const { request } = ctx;
  const { action } = request.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }

  ctx.body = {
    code: 0,
    data: await Counter.count(),
  };
});

// 获取计数
router.get("/api/count", async (ctx) => {
  const result = await Counter.count();

  ctx.body = {
    code: 0,
    data: result,
  };
});

// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
  if (ctx.request.headers["x-wx-source"]) {
    ctx.body = ctx.request.headers["x-wx-openid"];
  }
});

app
  .use(logger())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

async function bootstrap() {
  await initDB();
  console.log("启动成功", process.env.PORT || 80);
}
bootstrap();
