const http = require('http');
const fs = require('fs');
const url = require('url');
const ejs = require('ejs');
const mime = require('mime');
const etag = require('etag');
const Session = require('./session');
const consts = require('./consts');
const files = require('./files');
const {vurl} = require("@alan-liang/utils");

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
  func:(req, resp) => {
    // TODO:
    const session = new Session(req, resp);
    const uid = "23336666";
    if(session.get("userid")) {
      redirect(resp, "/home");
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
    // TODO:
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

//start server
const server = http.createServer((req, resp) => {
  const {pathname} = url.parse(req.url);
  const cb = vurl.query(pathname);
  if(cb) {
    try{
      cb(req, resp);
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
