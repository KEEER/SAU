const fs = require('fs');
const Wechat = require('wechat4u');
const qrcode = require('qrcode-terminal');
const consts = require('./consts').wechat;

let sendQueue = [];
let bot;
try {
  module.exports.bot = bot = new Wechat(require(consts.sessionFile));
} catch(e) {
  module.exports.bot = bot = new Wechat();
}
if(bot.PROP.uin) {
  bot.restart();
} else {
  bot.start();
}
bot.on("uuid", uuid => {
  qrcode.generate(`https://login.weixin.qq.com/l/${uuid}`, {
    small: true
  });
  console.log(`QRCode Link: https://login.weixin.qq.com/qrcode/${uuid}`);
});
bot.on("user-avatar", _ => {
  console.log("Please confirm login request.")
});
bot.on("login", () => {
  console.log("WeChat Logged in.");
  logEvent({id:"[[Server]]"}, "wechat:login", "WeChat Logged in");
  fs.writeFileSync(consts.sessionFile, JSON.stringify(bot.botData));
  module.exports.ready = true;
  sendQueue.forEach(msg => {
    send(msg);
  });
  sendQueue = [];
});
bot.on("error", e => {
  logEvent({id:"[[Server]]"}, "wechat:error", e ? e.stack || e : "No error provided");
});
bot.on("message", msg => {
  bot.sendMsg(msg.FromUserName, msg.FromUserName).catch(e => {});
});
module.exports.send = function send(config) {
  const {user = "filehelper", msg = "未知消息"} = config;
  if(!module.exports.ready) {
    sendQueue.push(config);
    return;
  }
  bot.sendMsg(msg, user).catch(e => {});
}

const {logEvent} = require('./utils');
