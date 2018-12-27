const http = require('http');
const fs = require('fs');
const ejs = require('ejs');
const url = require('url');

const server = http.createServer(async (req, resp) => {
  const path = url.parse(req.url).pathname;
  if(path == "/") {
    resp.writeHead(200,{"Content-Type":"text/html; charset=utf8"});
    resp.end(fs.readFileSync("static/index.html"));
    return;
  }
  if(path == "/img/github.svg") {
    resp.writeHead(200,{"Content-Type":"image/svg"});
    resp.end(fs.readFileSync("static/img/github.svg"));
    return;
  }
  if(path == "/styles.css") {
    resp.writeHead(200,{"Content-Type":"text/css"});
    resp.end(fs.readFileSync("static/styles.css"));
    return;
  }
  let html;
  try{
    html = await ejs.renderFile("static"+path+".ejs",{user:{role:"association"}});
  } catch(e) {
    html = "Error: "+e;
  } finally {
    resp.writeHead(200,{"Content-Type":"text/html; charset=utf8"});
    resp.end(html);
    return;
  }
});
server.listen(50082);
console.log("[INFO] OK.");
