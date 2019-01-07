const querystring = require('querystring');
const url = require('url');
const mime = require('mime');
const etag = require('etag');
const ejs = require('ejs');
const consts = require('./consts');
const Session = require('./session');
const User = require('./user');

class Utils{
  constructor(){}
  postData(req, parse) {
    return new Promise(function(resolve, reject) {
      let data = "";
      req.on("data", chunk => {
        if(!data) data = chunk;
        else data = Buffer.concat([data, chunk]);
      });
      req.on("end", () => {
        if(!req.complete) {
          reject(new Error("Incomplete Request"));
        }
        if(parse) {
          try{
            resolve(querystring.parse(data.toString()));
          } catch(e) {
            reject(e);
          }
        } else {
          resolve(data);
        }
      });
    });
  }
  createCallback(buffer) {
    //check if `buffer` isn't a buffer
    //in case of issues with length of Chinese
    if(!buffer instanceof Buffer) {
      buffer = Buffer.from(buffer);
    }
    const tag = etag(buffer);
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
  redirect(resp, path) {
    resp.writeHead(302, {"Location":path});
    resp.end();
  }
  htmlHead(resp, status) {
    resp.writeHead(status || 200, {"Content-Type":"text/html; charset=utf8"});
  }
  renderFile(path, obj) {
    obj.require = require;
    return ejs.renderFile(consts.http.ejsRoot + path, obj, {
      root:consts.http.ejsRoot,
      rmWhitespace:true
    });
  }
  authenticate(req, resp) {
    const session = new Session(req, resp);
    const uid = session.get("userid");
    if(!uid) {
      session.set("from", req.url);
      this.redirect(resp, "/");
      return;
    }
    return new User(uid);
  }
  handleLoggedin(req, resp) {
    const session = new Session(req, resp);
    const from = session.get("from");
    if(from) {
      session.remove("from");
      this.redirect(resp, from);
      return;
    }
    let location = "/home";
    if(new User(session.get("userid")).messagesReceived.some(msg => !msg.read)) {
      location = "/messages";
    }
    this.redirect(resp, location);
  }
}
module.exports = new Utils();
