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
    utils.logEvent(new User(uid), "user:login", "Logged in");
    utils.handleLoggedin(req, resp);
  }
});

//serve logout requests
vurl.add({
  path:"/logout",
  func:(req, resp) => {
    const session = new Session(req, resp);
    utils.logEvent({id:session.get("userid")}, "user:logout", "Logged out");
    session.remove();
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
    utils.logEvent(user, "user:passwd", "Changed password");
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
    utils.logEvent(user, "report:new", `Created report ${report.id}:\n${JSON.stringify(data, null, 2)}`);
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
    utils.logEvent(user, "application:new", `Created application ${app.id}:\n${JSON.stringify(data, null, 2)}`);
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
    utils.logEvent(user, "message:new", `Created message ${message.id}:\n${JSON.stringify(data, null, 2)}`);
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
    utils.logEvent(user, "home:change", `Updated home settings to:\n${JSON.stringify(data, null, 2)}`);
    utils.redirect(resp, "/home");
  },
  "user/new":async (req, resp) => {
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
      utils.redirect(resp, "/user/new?invalid");
      return;
    }
    let valid = true;
    [
      "id",
      "name",
      "role",
      "passwd"
    ].forEach(el => {
      if(!data[el]) valid = false;
    });
    if(User.has(data.id)) valid = false;
    if(!["admin", "officer", "association"].some(role => role === data.role)) {
      valid = false;
    }
    switch(data.role) {
      case "admin":
      break;

      default:
      if(!consts.user.types.some(type => type === data.type)) {
        valid = false;
      }
      break;
    }
    if(data.role === "association" && data.type === "room") {
      valid = false;
    }
    if(!valid) {
      utils.redirect(resp, "/user/new?invalid");
      return;
    }
    const _user = User.create(data);
    utils.logEvent(user, "user:new", `Created user ${_user.id}:\n${JSON.stringify(data, null, 2)}`);
    utils.redirect(resp, "/user/" + _user.id);
  },
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
      let log;
      if(file === "events") {
        log = await utils.eventLog;
      }
      utils.htmlHead(resp);
      resp.end(await utils.renderFile(`/${file}.ejs`,{
        user,
        associations,
        log
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
      utils.logEvent(user, "report:edit", `Modified report ${report.id}:\n${JSON.stringify(data, null, 2)}`);
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
      utils.logEvent(user, "application:edit", `Modified application ${application.id}:\n${JSON.stringify(data, null, 2)}`);
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
      utils.logEvent(user, "message:edit", `Modified message ${msg.id}:\n${JSON.stringify(data, null, 2)}`);
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

//Users
vurl.add({
  regexp:/^\/user\//i,
  func:async (req, resp) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!User.has(id)) {
      resp.writeHead(404, {"Content-Type":"text/plain"});
      resp.end(consts.http.errorMessage[404]);
      return;
    }
    if(user.role !== "admin") {
      utils.htmlHead(resp, 403);
      resp.end("403 Forbidden");
      return;
    }
    switch(req.method) {
      case "GET":
      utils.htmlHead(resp);
      resp.end(await utils.renderFile("/user/user.ejs", {
        user,
        _user:new User(id)
      }));
      return;

      case "POST":
      const data = await utils.postData(req, true);
      let error = "";
      if(!data) {
        resp.htmlHead(resp, 400);
        resp.end();
      }
      [
        "id",
        "name"
      ].forEach(el => {
        if(!data[el]) error += `${el} 未填写;`;
      });
      const _user = new User(id);
      switch(_user.role) {
        case "admin":
        break;

        default:
        if(!consts.user.types.some(type => type === data.type)) {
          error += "类别不合法;";
        }
        break;
      }
      let contact = null;
      if(_user.role === "association") {
        try {
          contact = JSON.parse(data.contact);
        } catch(e) {
          error += "联系方式格式错误;";
        }
      }
      if(data.id !== id && User.has(data.id)) { //ID Collision
        error += "uid撞上了;";
      }
      if(error) {
        utils.htmlHead(resp);
        resp.end(await utils.renderFile("/user/user.ejs", {
          user,
          error,
          _user:new User(id)
        }));
      } else {
        if(id !== data.id) { //Modify all related materials
          Application.
            getApplicationsById(id).
            concat(Report.getReportsById(id)).
            concat(Message.getMessagesByAuthorId(id)).
            forEach(el => {
              el.userid = data.id;
            });
          Session.all.forEach(session => {
            if(session.get("userid") === id) {
              session.set("userid", data.id);
            }
          });
          if(_user.role === "association") {
            Message.getMessagesById(id).forEach(msg => {
              msg.to = data.id;
            });
          }
          User.data[data.id] = User.data[id];
          delete User.data[id];
          _user.id = data.id;
        }
        [
          "name",
          "role",
          "type"
        ].forEach(el => {
          if(data[el]) {
            _user[el] = data[el];
          }
        });
        if(contact) {
          _user.contact = contact;
        }
        if(data.passwd) {
          _user.passwd = User.hash(data.passwd, _user.generateSalt());
          data.passwd = "[[Removed]]";
        }
        utils.logEvent(user, "user:edit", `Modified user ${id}:\n${JSON.stringify(data, null, 2)}`);
        if(id === data.id) {
          utils.htmlHead(resp);
          resp.end(await utils.renderFile("/user/user.ejs", {
            user,
            _user:new User(data.id)
          }));
        } else {
          utils.redirect(resp, `/user/${data.id}`);
        }
      }
      return;
    }
  }
});

//start server
const server = http.createServer(async (req, resp) => {
  resp.setHeader("Server", "SAU/" + consts.version);
  resp.setHeader("X-Author", ["Alan-Liang", "KEEER"]);
  const {pathname} = url.parse(req.url);
  const cb = vurl.query(pathname);
  if(cb) {
    try{
      await cb(req, resp);
      utils.logRequest(req, resp);
    }catch(e){
      try{
        utils.logRequest(req, resp, e);
        utils.logEvent({id:"[[Server]]"}, "server:error", e.stack || e);
        resp.writeHead(501, {"Content-Type":"text/plain"});
        resp.end(consts.http.errorMessage[501]);
        return;
      }catch(e1){}
    }
  }else{
    resp.writeHead(404, {"Content-Type":"text/plain"});
    resp.end(consts.http.errorMessage[404]);
    utils.logRequest(req, resp);
  }
});
server.listen(consts.http.port);
