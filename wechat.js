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
  console.log("Please confirm login request.");
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
  //bot.sendMsg(msg.FromUserName, msg.FromUserName).catch(_ => {});
});
bot.on("message", msg => {
  if (msg.MsgType == bot.CONF.MSGTYPE_VERIFYMSG && msg.RecommendInfo.Content === consts.verifyMsg) {
    bot.verifyUser(msg.RecommendInfo.UserName, msg.RecommendInfo.Ticket)
      .then(_ => {
        logEvent({id:"[[Server]]"}, "wechat:verify",
          `Verified ${bot.Contact.getDisplayName(msg.RecommendInfo)}`);
        console.log(msg.RecommendInfo);
      }).catch(_ => {});
  }
});
module.exports.send = function send(config) {
  const {user = "filehelper", msg = "未知消息"} = config;
  const contacts = [];
  for(const contact in bot.contacts) {
    contacts.push(bot.contacts[contact]);
  }
  contacts
    .filter(contact => contact.RemarkName === user)
    .map(contact => contact.UserName)
    .forEach(username => {
      if(!module.exports.ready) {
        sendQueue.push(config);
        return;
      }
      bot.sendMsg(msg, username).catch(_ => {});
    });
}

const {logEvent} = require('./utils');
