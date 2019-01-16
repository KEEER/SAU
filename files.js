const url = require('url');
const utils = require('./utils');
const crypto = require('crypto');
const Session = require('./session');
const {promisify} = require('util');
const fs = require('fs');
const User = require('./user');
const consts = require('./consts').files;
const DB = require('./db');

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const db = new DB(consts.file);

const getid = () => {
  const id = crypto.randomBytes(consts.idSize).toString(consts.idEncoding);
  if(id in db.data) {
    return getid();
  } else {
    return id;
  }
};

module.exports = (req, resp) => {
  if(typeof req === typeof "") {
    return db.data[req];
  }
  return (async () => {
    const session = new Session(req, resp || {setHeader:a => a});
    if(resp) { // is a request to read
      if(!session.get("userid")) {
        resp.writeHead(401);
        resp.end("401 Unauthorized");
      }
      const id = url.parse(req.url).pathname.split("/").pop();
      const obj = db.data[id];
      if(!obj) {
        resp.writeHead(404);
        resp.end("404 Not Found");
      }
      if(req.method === "DELETE") {
        if(session.get("userid") !== obj.userid) {
          resp.writeHead(401);
          resp.end("401 Unauthorized");
          return;
        }
        utils.logEvent(new User(obj.userid), "file:delete", `Deleted file ${db.data[id].name} (${id})`);
        await unlink(consts.dir + id + consts.ext);
        delete db.data[id];
        db.update();
        resp.writeHead(200);
        resp.end("OK");
        return;
      }
      const {name, length} = obj;
      resp.writeHead(200, {
        "Content-Type":"application/octet-stream",
        "Content-Disposition":`attachment; filename="${name}"`,
        "Content-Length":length
      });
      try {
        fs.createReadStream(consts.dir + id + consts.ext).pipe(resp);
      } catch(e) {
        resp.writeHead(502);
        resp.end("502 Internal Error");
      }
      return;
    } else { //is a request to write
      if(!session.get("userid")) throw new Error("Not logged in");
      const name = url.parse(req.url).pathname.split("/").pop().replace(/"/g,"");
      const data = await utils.postData(req);
      if(!data) throw new Error("No data received");
      if(data.length > consts.maxlength) throw new Error("MaxLength Exceeded");
      const id = getid();
      db.data[id] = {
        name,
        length:data.length,
        userid:session.get("userid")
      };
      db.update();
      utils.logEvent(new User(session.get("userid")), "file:new", `Uploaded file ${db.data[id].name} (${id})`);
      await writeFile(consts.dir + id + consts.ext, data);
      return id;
    }
  })();
};
