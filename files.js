const url = require('url');
const utils = require('./utils');
const crypto = require('crypto');
const Session = require('./session');
const {promisify} = require('util');
const fs = require('fs');
const consts = require('./consts').files;

const writeFile = promisify(fs.writeFile);
let _data;

const getid = () => {
  const id = crypto.randomBytes(consts.idSize).toString(consts.idEncoding);
  if(id in _data) {
    return getid();
  } else {
    return id;
  }
};

module.exports = async (req, resp) => {
  const session = new Session(req, resp || {setHeader:a => a});
  if(resp) { // is a request to read
    if(!session.get("userid")) {
      resp.writeHead(401);
      resp.end("401 Unauthorized");
    }
    const id = url.parse(req.url).pathname.split("/").pop();
    const obj = _data[id];
    if(!obj) {
      resp.writeHead(404);
      resp.end("404 Not Found");
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
    _data[id] = {
      name,
      length: data.length
    };
    await writeFile(consts.dir + id + consts.ext, data);
    await writeFile(consts.file, JSON.stringify(_data));
    return id;
  }
};

try{
  _data = JSON.parse(fs.readFileSync(consts.file).toString());
}catch(e){
  _data = {};
}
