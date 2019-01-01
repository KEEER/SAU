const http = require('http');
const fs = require('fs');
const url = require('url');
const ejs = require('ejs');
const mime = require('mime');
const etag = require('etag');
const User = require('./user');
const utils = require('./utils');
const Session = require('./session');
const consts = require('./consts');
const files = require('./files');
const Report = require('./report');
const {vurl} = require("@alan-liang/utils");

ejs.root = consts.http.ejsRoot;
ejs.rmWhitespace = true;

//serve static files
const createCallback = buffer => {
  //check if `buffer` isn't a buffer
  //in case of issues with length of Chinese
  if(!buffer instanceof Buffer) {
    buffer = Buffer.from(buffer);
  }
  const tag=etag(buffer);
  return (req, resp) => {
    const {pathname} = url.parse(req.url);
    if(req.headers["if-none-match"] === tag) {
      resp.writeHead(304, {ETag:tag});
      resp.end();
      return;
    }
    let type = mime.getType(pathname.substr(1));
    if(pathname === "/" || type === "text/html") {
      type = "text/html; charset=utf8";
    }
    resp.writeHead(200, {
      "Content-Type":type,
      "Content-Length":buffer.length,
      ETag:tag
    });
    resp.end(buffer);
  };
};
consts.http.staticFiles.forEach(name => {
  const buffer = fs.readFileSync(consts.http.staticDir + name);
  const cb = createCallback(buffer);
  vurl.add({
    path:"/" + name,
    func:cb
  });
});

function redirect(resp, path) {
  resp.writeHead(302, {"Location":path});
  resp.end();
}

function htmlHead(resp, status) {
  resp.writeHead(status || 200, {"Content-Type":"text/html; charset=utf8"});
}

function renderFile(path, obj) {
  obj.require = require;
  return ejs.renderFile(consts.http.ejsRoot + path, obj, {
    root:consts.http.ejsRoot,
    rmWhitespace:true
  });
}

//index page
vurl.add({
  path:"/",
  func:(req, resp) => {
    const session = new Session(req,resp);
    if(session.get("userid")) {
      redirect(resp, "/home");
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
      redirect(resp, "/home");
      return;
    }
    if(!info || !info.userid || !info.passwd) {
      redirect(resp, "/");
    }
    const uid = info.userid;
    if(!User.has(uid) || !(new User(uid)).isValidPasswd(info.passwd)) {
      redirect(resp, "/?invalid");
      return;
    }
    session.set("userid",uid);
    redirect(resp, "/home");
  }
});

//serve logout requests
vurl.add({
  path:"/logout",
  func:(req, resp) => {
    new Session(req, resp).remove();
    redirect(resp, "/");
  }
});

//file uploading
vurl.add({
  regexp:/^\/file\/new\//i,
  func:async (req, resp) => {
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
    const session = new Session(req, resp);
    const uid = session.get("userid");
    if(!uid) {
      redirect(resp, "/");
      return;
    }
    let passwd;
    try {
      passwd = await utils.postData(req, true);
    } catch(e) {
      redirect(resp, "/settings");
      return;
    }
    const user = new User(uid);
    console.log(passwd);
    if(!user.isValidPasswd(passwd.current)) {
      redirect(resp, "/settings?invalid");
      return;
    }
    if(passwd.new !== passwd.repeat || !passwd.new) {
      redirect(resp, "/settings");
      return;
    }
    user.passwd = User.hash(passwd.new, user.generateSalt());
    redirect(resp, "/settings?ok");
  },
  "report/new":async (req, resp) => {
    const session = new Session(req, resp);
    const uid = session.get("userid");
    if(!uid) {
      redirect(resp, "/");
      return;
    }
    const user = new User(uid);
    let data;
    try {
      data = await utils.postData(req, true);
    } catch(e) {
      redirect(resp, "/report/new?invalid");
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
      redirect(resp, "/report/new?invalid");
      return;
    }
    data.userid = user.id;
    const report = Report.create(data);
    redirect(resp, "/report/" + report.id);
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
        htmlHead(resp, 404);
        resp.end(consts.http.errorMessage[404]);
      }
      const session = new Session(req, resp);
      const uid = session.get("userid");
      if(!uid) {
        redirect(resp, "/");
        return;
      }
      const user = new User(uid);
      htmlHead(resp);
      resp.end(await renderFile(`/${file}.ejs`,{user}));
    }
  });
});

//Reports
vurl.add({
  regexp:/^\/report\//i,
  func:async (req, resp) => {
    const id = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
    const session = new Session(req, resp);
    const uid = session.get("userid");
    if(!uid) {
      redirect(resp, "/");
      return;
    }
    const user = new User(uid);
    if(!Report.has(id)) {
      resp.writeHead(404, {"Content-Type":"text/plain"});
      resp.end(consts.http.errorMessage[404]);
      return;
    }
    const report = new Report(id);
    if(req.method !== "GET") {
      if(user.role === "association") {
        htmlHead(resp, 403);
        resp.end("403 Forbidden");
        return;
      }
      const data = await utils.postData(req, true);
      if(!data || !data.score || !data.size) {
        htmlHead(resp, 400);
        resp.end("400 Bad Request");
        return;
      }
      report.score = parseInt(data.score);
      report.checkedsize = data.size;
      // TODO: send update message
    }
    htmlHead(resp);
    resp.end(await renderFile("/report/report.ejs", {
      user,
      report
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
