const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const { streamEvents } = require('http-event-stream');
const uuid = require('uuid');
const app = new Koa();

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUD, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

const router = new Router();
const generateMsg = 50;
const historyMsg  = [];
let amountMsg = 0;

const messageItem = {
  event: 'comment',
  data: JSON.stringify({
    field: 'action',
    msg: 'Игра началась',
    date: new Date(),
  }),
  id: uuid.v4(),
};
historyMsg.push(messageItem);

const intervals = setInterval(() => { 
  const msgAction = {field: 'action', msg: 'Идёт перемещение мяча по полю, игроки и той, и другой команды активно пытаются атаковать'};
  const msgFreekick = {field: 'freekick', msg: 'Нарушение правил, будет штрафной удар'};
  const msgGoal = {field: 'goal', msg: 'Отличный удар! И Г-О-Л!'};
  const randomMsg = [msgAction, msgFreekick, msgGoal];
  
  let itemMsg = 0;
  const itemId = uuid.v4();
  const randomPoz = Math.floor(Math.random() * 100);
  if (randomPoz < 10) {
    itemMsg = 2;
  } else if (randomPoz < 50) {
    itemMsg = 1;
  } else {
    itemMsg = 0;
  }
  randomMsg[itemMsg].date = new Date();
  randomMsg[itemMsg].id = itemId;
  
  const messageItem = {
    event: 'comment',
    data: JSON.stringify(randomMsg[itemMsg]),
    id: itemId
  };
  // console.log(randomMsg[itemMsg]);

  historyMsg.push(messageItem);

  amountMsg += 1;
  if (amountMsg > generateMsg) clearInterval(intervals);
}, 2000);

router.get('/sse', async (ctx) => {
  console.log('start sse');
  streamEvents(ctx.req, ctx.res, {
    async fetch(lastEventId) {
      console.log(lastEventId);
      return [];
    },
    stream(sse) {
      let amountMsg = 0;
      const interval = setInterval(() => {
        // const itemId = uuid.v4();
        // let messageItem = {          
        //   event: 'comment',
        //   data: JSON.stringify({field: 'value', amountMsg: `${amountMsg}`, id: `${itemId}`}),
        //   id: itemId
        // };
        // sse.sendEvent(messageItem);

        if(historyMsg.length > amountMsg) {
          sse.sendEvent(historyMsg[amountMsg]);
          amountMsg += 1;
        }

        if (amountMsg > generateMsg) clearInterval(interval);
      }, 1000);

      return () => clearInterval(interval);
    }
  });

  ctx.respond = false; // koa не будет обрабатывать ответ
});

router.get('/index', async (ctx) => {
  ctx.response.body = 'hello';
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback())
server.listen(port);
