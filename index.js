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

// IM回调处理
router.post("/imcallback", async (ctx) => {
  const requestBody = ctx.request.body;
  
  // 解析请求字段
  const {
    CallbackCommand,    // 回调命令
    From_Account,       // 消息发送者 UserID
    To_Account,         // 消息接收者 UserID
    MsgSeq,            // 消息序列号
    MsgRandom,         // 消息随机数
    MsgTime,           // 消息发送时间戳
    MsgKey,            // 消息唯一标识
    MsgId,             // 客户端消息唯一标识
    OnlineOnlyFlag,    // 是否仅在线用户接收标识
    SendMsgResult,     // 消息发送结果
    ErrorInfo,         // 错误信息
    MsgBody,           // 消息体
    CloudCustomData,   // 自定义数据
    EventTime          // 事件触发时间戳
  } = requestBody;

  console.log('收到IM回调请求:', {
    CallbackCommand,
    From_Account,
    To_Account,
    MsgSeq,
    MsgTime,
    MsgKey,
    SendMsgResult,
    MsgBody
  });

  // 返回处理结果
  ctx.body = {
    ActionStatus: 'OK',           // 请求处理的结果，OK 表示处理成功，FAIL 表示失败
    ErrorCode: 0,                 // 错误码，0表示成功
    ErrorInfo: 'send msg succeed' // 错误信息
  };
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
