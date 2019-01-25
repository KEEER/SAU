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
const {InternalError, redirect, httpError, internalRedirect} = require("./internal-error");

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
      throw internalRedirect("/index.html");
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
      throw redirect("/");
    }
    const uid = info.userid;
    if(!User.has(uid) || !(new User(uid)).isValidPasswd(info.passwd)) {
      throw redirect("/?invalid");
    }
    session.set("userid",uid);
    utils.logEvent(new User(uid), "user:login", "Logged in");
    utils.handleLoggedin(req, resp);
    return;
  }
});

//serve logout requests
vurl.add({
  path:"/logout",
  func:(req, resp) => {
    const session = new Session(req, resp);
    utils.logEvent({id:session.get("userid")}, "user:logout", "Logged out");
    session.remove();
    throw redirect("/");
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
      throw redirect("/settings");
    }
    if(!user.isValidPasswd(passwd.current)) {
      throw internalRedirect(`/settings`, {
        snackbar: "原密码不正确"
      });
    }
    if(passwd.new !== passwd.repeat || !passwd.new) {
      throw redirect("/settings");
    }
    user.passwd = User.hash(passwd.new, user.generateSalt());
    utils.logEvent(user, "user:passwd", "Changed password");
    throw internalRedirect("/settings", {
      snackbar: "修改密码成功"
    });
  },
  "report/new":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      throw internalRedirect("/report/new", {
        snackbar: "信息填写不完整"
      });
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
    if(!utils.verifyCsrfToken(req, data)) {
      throw internalRedirect("/report/new", {
        snackbar:"CSRF不匹配"
      });
    }
    if(!valid) {
      throw internalRedirect("/report/new", {
        snackbar: "信息填写不完整"
      });
    }
    data.userid = user.id;
    const report = Report.create(data);
    utils.logEvent(user, "report:new", `Created report ${report.id}:\n${JSON.stringify(data, null, 2)}`);
    throw redirect("/report/" + report.id);
  },
  "application/new":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      throw internalRedirect("/application/new", {
        snackbar: "信息填写不完整"
      });
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
    if(!utils.verifyCsrfToken(req, data)) {
      throw internalRedirect("/application/new", {
        snackbar: "CSRF不匹配"
      });
    }
    if(!valid) {
      throw internalRedirect("/application/new", {
        snackbar: "信息填写不完整"
      });
    }
    data.userid = user.id;
    const app = Application.create(data);
    utils.logEvent(user, "application:new", `Created application ${app.id}:\n${JSON.stringify(data, null, 2)}`);
    throw redirect("/application/" + app.id);
  },
  "message/new":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      throw internalRedirect("/message/new", {
        snackbar: "信息填写不完整"
      });
    }
    let valid = true;
    [
      "title",
      "to",
      "content"
    ].forEach(el => {
      if(!data[el]) valid = false;
    });
    if(!utils.verifyCsrfToken(req, data)) {
      valid = false;
    }
    if(!valid) {
      throw internalRedirect("/message/new", {
        snackbar: "信息填写不完整"
      });
    }
    data.userid = user.id;
    const message = Message.create(data);
    utils.logEvent(user, "message:new", `Created message ${message.id}:\n${JSON.stringify(data, null, 2)}`);
    throw redirect("/message/" + message.id);
  },
  "home-settings":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(user.role !== "admin") {
      throw httpError(403);
    }
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      throw internalRedirect("/home-settings", {
        snackbar: "信息填写不完整"
      });
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
      }
    });
    if(!utils.verifyCsrfToken(req, data)) {
      throw internalRedirect("/home-settings", {
        snackbar: "CSRF不匹配"
      });
    }
    if(!valid) {
      throw internalRedirect("/home-settings", {
        snackbar: "信息填写不完整"
      });
    }
    utils.logEvent(user, "home:edit", `Updated home settings to:\n${JSON.stringify(data, null, 2)}`);
    throw redirect("/home");
  },
  "user/new":async (req, resp) => {
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(user.role !== "admin") {
      throw httpError(403);
    }
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      throw internalRedirect("/user/new", {
        snackbar: "信息填写不完整"
      });
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
    if(!utils.verifyCsrfToken(req, data)) {
      throw internalRedirect("/user/new", {
        snackbar: "CSRF不匹配"
      });
    }
    if(!valid) {
      throw internalRedirect("/user/new", {
        snackbar: "信息填写不完整"
      });
    }
    const _user = User.create(data);
    utils.logEvent(user, "user:new", `Created user ${_user.id}:\n${JSON.stringify(data, null, 2)}`);
    throw redirect("/user/" + _user.id);
  },
};

//ejs files
consts.http.ejsFiles.forEach(file => {
  vurl.add({
    "path":"/" + file,
    func:async (req, resp, extra) => {
      if(req.method !== "GET") {
        if(ejsHandlers[file]) {
          return await ejsHandlers[file](req, resp);
        }
        throw httpError(404);
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
      const data = Object.assign({associations, log}, extra || {})
      await utils.serveEjs(req, resp, `/${file}.ejs`, data);
    }
  });
});

//Reports
vurl.add({
  regexp:/^\/report\//i,
  func:async (req, resp, extra) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!Report.has(id)) {
      throw httpError(404);
    }
    const report = new Report(id);
    if(req.method !== "GET") {
      if(user.role === "association" || user.type === "room") {
        throw httpError(403);
      }
      const data = await utils.postData(req, true);
      if(!data || !data.score || !data.size || parseInt(data.score) !== parseInt(data.score)) {
        throw httpError(400);
      }
      const score = parseInt(data.score);
      if(
        (score < (report.score || 0) &&
         user.role !== "admin"))
      {
        throw internalRedirect(`/report/${id}`, {
          snackbar: "扣分操作需要管理员权限"
        });
      }
      if(!utils.verifyCsrfToken(req, data)) {
        throw internalRedirect(`/report/${id}`, {
          snackbar: "CSRF不匹配"
        });
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
      throw internalRedirect(`/report/${id}`, {
        snackbar: "修改成功"
      });
    }
    utils.htmlHead(resp);
    await utils.serveEjs(req, resp, "/report/report.ejs", {
      report,
      snackbar: extra ? extra.snackbar : null
    });
  }
});

//Applications
vurl.add({
  regexp:/^\/application\//i,
  func:async (req, resp, extra) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!Application.has(id)) {
      throw httpError(404);
    }
    const application = new Application(id);
    if(req.method !== "GET") {
      if((user.role === "association" || (
        user.type === "room" &&
        application.type !== "room")))
      {
        throw httpError(403);
      }
      const data = await utils.postData(req, true);
      if(!data || !data.score || !data.reply || !utils.verifyCsrfToken(req, data)) {
        throw httpError(400);
      }
      const score = parseInt(data.score);
      if(score < (application.score || 0) && user.role !== "admin") {
        throw internalRedirect(`/application/${id}`, {
          snackbar: "扣分操作需要管理员权限"
        });
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
      throw internalRedirect(`/application/${id}`, {
        snackbar: "更新成功"
      });
    }
    utils.htmlHead(resp);
    await utils.serveEjs(req, resp, "/application/application.ejs", {
      application,
      snackbar: extra ? extra.snackbar : null
    });
  }
});

//Messages
vurl.add({
  regexp:/^\/message\//i,
  func:async (req, resp, extra) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!Message.has(id)) {
      throw httpError(404);
    }
    const msg = new Message(id);
    if(req.method !== "GET") {
      if(user.role === "association") {
        throw httpError(403);
      }
      const data = await utils.postData(req, true);
      if(!data || !data.score || !utils.verifyCsrfToken(req, data)) {
        throw httpError(400);
      }
      const score = parseInt(data.score);
      if(score < (msg.score || 0) && user.role !== "admin") {
        throw internalRedirect(`/message/${id}`, {
          snackbar: "扣分操作需要管理员权限"
        });
      }
      msg.score = parseInt(data.score);
      utils.logEvent(user, "message:edit", `Modified message ${msg.id}:\n${JSON.stringify(data, null, 2)}`);
      throw internalRedirect(`/message/${id}`, {
        snackbar: "更新成功"
      });
    }
    utils.htmlHead(resp);
    await utils.serveEjs(req, resp, "/message/message.ejs", {
      message:msg,
      snackbar:extra ? extra.snackbar : null
    });
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
      throw httpError(404);
    }
    if(user.role === "association") {
      throw httpError(403);
    }
    utils.htmlHead(resp);
    await utils.serveEjs(req, resp, "/association/association.ejs", {association:new User(id)});
  }
});

//Users
vurl.add({
  regexp:/^\/user\//i,
  func:async (req, resp, extra) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const user = utils.authenticate(req, resp);
    if(!user) return;
    if(!User.has(id)) {
      throw httpError(404);
    }
    if(user.role !== "admin") {
      throw httpError(403);
    }
    switch(req.method) {
      case "GET":
      utils.htmlHead(resp);
      await utils.serveEjs(req, resp, "/user/user.ejs", {
        _user:new User(id),
        snackbar:extra ? extra.snackbar : null
      });
      return;

      case "POST":
      const data = await utils.postData(req, true);
      const _user = new User(id);
      if(data.action === "delete") {
        if(id === user.id || !utils.verifyCsrfToken(req, data)) {
          throw httpError(400);
        }
        Application.
          getApplicationsById(id).
          concat(Report.getReportsById(id)).
          concat(Message.getMessagesByAuthorId(id)).
          forEach(el => {
            el.remove();
          });
        Session.all.forEach(session => {
          if(session.get("userid") === id) {
            session.remove();
          }
        });
        if(_user.role === "association") {
          Message.getMessagesById(id).forEach(msg => {
            msg.remove();
          });
        }
        delete User.db.data[id];
        User.db.update();
        utils.logEvent(user, "user:remove", `Removed user ${id}`);
        throw redirect("/users");
      }

      let error = "";
      if(!data) {
        throw httpError(400);
      }
      [
        "id",
        "name"
      ].forEach(el => {
        if(!data[el]) error += `${el} 未填写;`;
      });
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
        if(data.type === "room") {
          error += "社团类型不能为定教室";
        }
        try {
          contact = JSON.parse(data.contact);
        } catch(e) {
          error += "联系方式格式错误;";
        }
      }
      if(data.id !== id && User.has(data.id)) { //ID Collision
        error += "uid撞上了;";
      }
      if(!utils.verifyCsrfToken(req, data)) {
        error += "奇奇怪怪的问题";
      }
      if(error) {
        utils.htmlHead(resp);
        await utils.serveEjs(req, resp, "/user/user.ejs", {
          snackbar:error,
          _user:new User(id)
        });
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
        User.db.update();
        utils.logEvent(user, "user:edit", `Modified user ${id}:\n${JSON.stringify(data, null, 2)}`);
        if(id === data.id) {
          utils.htmlHead(resp);
          await utils.serveEjs(req, resp, "/user/user.ejs", {_user:new User(data.id)});
        } else {
          throw redirect(`/user/${data.id}`);
        }
      }
      return;
    }
  }
});

const handleCallback = async (req, resp, cb, extra) => {
  if(!cb) return;
  try{
    await cb(req, resp, extra);
    utils.logRequest(req, resp);
  }catch(e){
    if(e instanceof InternalError) {
      switch(e.type) {
        case InternalError.HTTP_ERROR:
        resp.writeHead(e.data, {"Content-Type":"text/plain"});
        resp.end(consts.http.errorMessage[e.data] || `HTTP Error ${e.data}`);
        break;

        case InternalError.INTERNAL_REDIRECT:
        req.url = e.data;
        req.method = "GET";
        return await handleRequest(req, resp, e.extra);

        case InternalError.REDIRECT:
        utils.redirect(resp, e.data);
        return;
      }
    } else try {
      utils.logRequest(req, resp, e);
      utils.logEvent({id:"[[Server]]"}, "server:error", e.stack || e);
      resp.writeHead(501, {"Content-Type":"text/plain"});
      resp.end(consts.http.errorMessage[501]);
      return;
    }catch(e1){}
  }
};

const handleRequest = async (req, resp, extra) => {
    resp.setHeader("Server", "SAU/" + consts.version);
    resp.setHeader("X-Author", ["Alan-Liang", "KEEER"]);
    resp.setHeader("X-Frame-Options", "DENY");
    const { pathname } = url.parse(req.url);
    const cb = vurl.query(pathname);
    if (cb) {
      await handleCallback(req, resp, cb, extra);
    } else {
      resp.writeHead(404, { "Content-Type": "text/plain" });
      resp.end(consts.http.errorMessage[404]);
      utils.logRequest(req, resp);
    }
};

//start server
const server = http.createServer(handleRequest);
server.listen(consts.http.port);

//logging on start & exit
utils.onExit(code => {
  utils.logEventSync({id:"[[Server]]"}, "server:exit", `Process exiting with code ${code}.`);
});

process.nextTick(() => process.nextTick(() => {
  process.on('SIGINT', () => {
    process.exit(129);
  });

  process.on('SIGTERM', () => {
    process.exit(130);
  });
}));

utils.logEventSync({id:"[[Server]]"}, "server:start", "SAU Server started.");
