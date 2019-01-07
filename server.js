const http = require('http');
const fs = require('fs');
const url = require('url');
const User = require('./user');
const utils = require('./utils');
const Session = require('./session');
const consts = require('./consts');
const files = require('./files');
const Report = require('./report');
const Application = require('./application');
const Message = require('./message');
const Home = require('./home');
const {vurl} = require("@alan-liang/utils");

//serve static files
consts.http.staticFiles.forEach(name => {
  const buffer = fs.readFileSync(consts.http.staticDir + name);
  const cb = utils.createCallback(buffer);
  vurl.add({
    path:"/" + name,
    func:cb
  });
});

//index page
vurl.add({
  path:"/",
  func:(req, resp) => {
    const session = new Session(req,resp);
    if(session.get("userid")) {
      utils.handleLoggedin(req, resp);
      return;
    } else {
      vurl.query("/index.html")(req, resp);
    }
  }
});

//serve login requests
vurl.add({
  path:"/login",
  func:async (req, resp) => {
    const session = new Session(req, resp);
    const info = await utils.postData(req, true);
    if(session.get("userid")) {
      utils.handleLoggedin(req, resp);
      return;
    }
    if(!info || !info.userid || !info.passwd) {
      utils.redirect(resp, "/");
    }
    const uid = info.userid;
    if(!User.has(uid) || !(new User(uid)).isValidPasswd(info.passwd)) {
      utils.redirect(resp, "/?invalid");
      return;
    }
    session.set("userid",uid);
    utils.handleLoggedin(req, resp);
  }
});

//serve logout requests
vurl.add({
  path:"/logout",
  func:(req, resp) => {
    new Session(req, resp).remove();
    utils.redirect(resp, "/");
  }
});

//file uploading
vurl.add({
  regexp:/^\/file\/new\//i,
  func:async (req, resp) => {
    //no need to auth because files() will handle that
    let id;
    try {
      id = await files(req);
    } catch(e) {
      console.error(e);
      resp.writeHead(400, {"Content-Type":"application/json"});
      resp.end('{"code":400,"text":"Bad Request"}');
      return;
    }
    resp.writeHead(200, {"Content-Type":"application/json"});
    resp.end(`{"code":200,"text":"OK","id":"${id}"}`);
  }
});

//file downloading
vurl.add({
  regexp:/^\/file\//i,
  func:files
});

const ejsHandlers = {
  "settings":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    let passwd;
    try {
      passwd = await utils.postData(req, true);
    } catch(e) {
      utils.redirect(resp, "/settings");
      return;
    }
    if(!user.isValidPasswd(passwd.current)) {
      utils.redirect(resp, "/settings?invalid");
      return;
    }
    if(passwd.new !== passwd.repeat || !passwd.new) {
      utils.redirect(resp, "/settings");
      return;
    }
    user.passwd = User.hash(passwd.new, user.generateSalt());
    utils.redirect(resp, "/settings?ok");
  },
  "report/new":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      utils.redirect(resp, "/report/new?invalid");
      return;
    }
    let valid = true;
    [
      "title",
      "size",
      "begin",
      "time",
      "place",
      "description"
    ].forEach(el => {
      if(!data[el]) valid = false;
    });
    if(!valid) {
      utils.redirect(resp, "/report/new?invalid");
      return;
    }
    data.userid = user.id;
    const report = Report.create(data);
    utils.redirect(resp, "/report/" + report.id);
  },
  "application/new":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      utils.redirect(resp, "/application/new?invalid");
      return;
    }
    let valid = true;
    [
      "title",
      "type",
      "description"
    ].forEach(el => {
      if(!data[el]) valid = false;
    });
    if(!["room", "ad", "xl-activity", "outer-activity"].some(type => type === data.type)) {
      valid = false;
    }
    switch(data.type) {
      case "room":
      [
        "time1",
        "place1",
        "time2",
        "place2",
        "time3",
        "place3"
      ].forEach(el => {
        if(!data[el]) valid = false;
      });
      break;

      default:
      [
        "time",
        "place",
        "begin",
      ].forEach(el => {
        if(!data[el]) valid = false;
      });
      break;
    }
    if(!valid) {
      utils.redirect(resp, "/application/new?invalid");
      return;
    }
    data.userid = user.id;
    const app = Application.create(data);
    utils.redirect(resp, "/application/" + app.id);
  },
  "message/new":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      utils.redirect(resp, "/message/new?invalid");
      return;
    }
    let valid = true;
    [
      "title",
      "to",
      "content"
    ].forEach(el => {
      if(!data[el]) valid = false;
    });
    if(!valid) {
      utils.redirect(resp, "/message/new?invalid");
      return;
    }
    data.userid = user.id;
    const message = Message.create(data);
    utils.redirect(resp, "/message/" + message.id);
  },
  "home-settings":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(user.role !== "admin") {
      utils.htmlHead(resp, 403);
      resp.end("403 Forbidden");
      return;
    }
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      utils.redirect(resp, "/home-settings?invalid");
      return;
    }
    let valid = true;
    [
      "carousel",
      "links"
    ].forEach(el => {
      if(!data[el]) valid = false;
      try {
        Home[el] = JSON.parse(data[el]);
      } catch(e) {
        valid = false;
        console.log(e);
      }
    });
    if(!valid) {
      utils.redirect(resp, "/home-settings?invalid");
      return;
    }
    utils.redirect(resp, "/home");
  }
};

//ejs files
consts.http.ejsFiles.forEach(file => {
  vurl.add({
    "path":"/" + file,
    func:async (req, resp) => {
      if(req.method !== "GET") {
        if(ejsHandlers[file]) {
          return await ejsHandlers[file](req, resp);
        }
        utils.htmlHead(resp, 404);
        resp.end(consts.http.errorMessage[404]);
      }
      const user = utils.authenticate(req, resp);
      if(!user) return;
      const associations = User.all.filter(user => {
        return user.role === "association"
      });
      utils.htmlHead(resp);
      resp.end(await utils.renderFile(`/${file}.ejs`,{
        user,
        associations
      }));
    }
  });
});

//Reports
vurl.add({
  regexp:/^\/report\//i,
  func:async (req, resp) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!Report.has(id)) {
      resp.writeHead(404, {"Content-Type":"text/plain"});
      resp.end(consts.http.errorMessage[404]);
      return;
    }
    const report = new Report(id);
    if(req.method !== "GET") {
      if(user.role === "association" || user.type === "room") {
        utils.htmlHead(resp, 403);
        resp.end("403 Forbidden");
        return;
      }
      const data = await utils.postData(req, true);
      if(!data || !data.score || !data.size || parseInt(data.score) !== parseInt(data.score)) {
        utils.htmlHead(resp, 400);
        resp.end("400 Bad Request");
        return;
      }
      const score = parseInt(data.score);
      if(score < (report.score || 0) && user.role !== "admin") {
        utils.redirect(resp, "?needAdmin");
        return;
      }
      report.score = score;
      report.checkedsize = data.size;
      Message.create({
        userid:user.id,
        to:report.userid,
        title:`分数更新提醒`,
        content:`您的活动报告"${report.title}"分数已更新为${report.score}`,
      });
      if(req.url.indexOf("needAdmin") > -1) {
        utils.redirect(resp, "?");
        return;
      }
    }
    utils.htmlHead(resp);
    resp.end(await utils.renderFile("/report/report.ejs", {
      user,
      report
    }));
  }
});

//Applications
vurl.add({
  regexp:/^\/application\//i,
  func:async (req, resp) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!Application.has(id)) {
      resp.writeHead(404, {"Content-Type":"text/plain"});
      resp.end(consts.http.errorMessage[404]);
      return;
    }
    const application = new Application(id);
    if(req.method !== "GET") {
      if(user.role === "association" || (
        user.type === "room" &&
        application.type !== "room"
      )) {
        utils.htmlHead(resp, 403);
        resp.end("403 Forbidden");
        return;
      }
      const data = await utils.postData(req, true);
      if(!data || !data.score || !data.reply) {
        utils.htmlHead(resp, 400);
        resp.end("400 Bad Request");
        return;
      }
      const score = parseInt(data.score);
      if(score < (application.score || 0) && user.role !== "admin") {
        utils.redirect(resp, "?needAdmin");
        return;
      }
      application.score = parseInt(data.score);
      application.reply = data.reply;
      Message.create({
        userid:user.id,
        to:application.userid,
        title:`申请更新提醒`,
        content:`您的申请"${application.title}"已更新，回复为：${application.reply}，扣分为：${application.score}`,
      });
      if(req.url.indexOf("needAdmin") > -1) {
        utils.redirect(resp, "?");
        return;
      }
    }
    utils.htmlHead(resp);
    resp.end(await utils.renderFile("/application/application.ejs", {
      user,
      application
    }));
  }
});

//Messages
vurl.add({
  regexp:/^\/message\//i,
  func:async (req, resp) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!Message.has(id)) {
      resp.writeHead(404, {"Content-Type":"text/plain"});
      resp.end(consts.http.errorMessage[404]);
      return;
    }
    const msg = new Message(id);
    if(req.method !== "GET") {
      if(user.role === "association") {
        utils.htmlHead(resp, 403);
        resp.end("403 Forbidden");
        return;
      }
      const data = await utils.postData(req, true);
      if(!data || !data.score) {
        utils.htmlHead(resp, 400);
        resp.end("400 Bad Request");
        return;
      }
      const score = parseInt(data.score);
      if(score < (msg.score || 0) && user.role !== "admin") {
        utils.redirect(resp, "?needAdmin");
        return;
      }
      msg.score = parseInt(data.score);
      if(req.url.indexOf("needAdmin") > -1) {
        utils.redirect(resp, "?");
        return;
      }
    }
    utils.htmlHead(resp);
    resp.end(await utils.renderFile("/message/message.ejs", {
      user,
      message:msg
    }));
  }
});

//Associations
vurl.add({
  regexp:/^\/association\//i,
  func:async (req, resp) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!User.has(id)) {
      resp.writeHead(404, {"Content-Type":"text/plain"});
      resp.end(consts.http.errorMessage[404]);
      return;
    }
    if(user.role === "association") {
      utils.htmlHead(resp, 403);
      resp.end("403 Forbidden");
      return;
    }
    utils.htmlHead(resp);
    resp.end(await utils.renderFile("/association/association.ejs", {
      user,
      association:new User(id)
    }));
  }
});

//start server
const server = http.createServer(async (req, resp) => {
  const {pathname} = url.parse(req.url);
  const cb = vurl.query(pathname);
  if(cb) {
    try{
      await cb(req, resp);
    }catch(e){
      try{
        console.log(e);
        resp.writeHead(501, {"Content-Type":"text/plain"});
        resp.end(consts.http.errorMessage[501]);
      }catch(e1){}
    }
  }else{
    resp.writeHead(404, {"Content-Type":"text/plain"});
    resp.end(consts.http.errorMessage[404]);
  }
});
server.listen(consts.http.port);
