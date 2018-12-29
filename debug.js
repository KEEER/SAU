const http = require('http');
const fs = require('fs');
const ejs = require('ejs');
const url = require('url');

ejs.rmWhitespace=true;

const server = http.createServer(async (req, resp) => {
  const path = url.parse(req.url).pathname;
  if(path == "/") {
    resp.writeHead(200,{"Content-Type":"text/html; charset=utf8"});
    resp.end(fs.readFileSync("static/index.html"));
    return;
  }
  if(path == "/login"){
    resp.writeHead(302,{"Location":"/home"});
    resp.end();
    return;
  }
  if(path == "/logout"){
    resp.writeHead(302,{"Location":"/"});
    resp.end();
    return;
  }
  if(path == "/img/github.svg") {
    resp.writeHead(200,{"Content-Type":"image/svg+xml"});
    resp.end(fs.readFileSync("static/img/github.svg"));
    return;
  }
  if(path == "/styles.css") {
    resp.writeHead(200,{"Content-Type":"text/css"});
    resp.end(fs.readFileSync("static/styles.css"));
    return;
  }
  let html;
  const isOfficer = url.parse(req.url, true).query.isOfficer!==undefined;
  try{
    html = await ejs.renderFile("static"+path+".ejs",{
      user:{
        role:isOfficer?"officer":"association",
        name:"KEEER",
        reports:[
          {
            title:"活动1",
            id:"report"
          }
        ],
        applications:[
          {
            title:"Application Title",
            id:"new"
          }
        ]
      },
      report:{
        title:"活动1",
        name:"客页KEEER",
        begin:"2018年",
        time:"1秒",
        place:"空中花园",
        size:"xlarge",
        content:"你\n好\n<script>alert(/xss/);</script>\n",
        checkedsize:"large",
        score:200
      }
    },
    {
      root:__dirname+"/static/"
    }
  );
  } catch(e) {
    html = "<textarea>Error: "+e.stack+"</textarea>";
  } finally {
    resp.writeHead(200,{"Content-Type":"text/html; charset=utf8"});
    resp.end(html);
    return;
  }
});
server.listen(50082);
console.log("[INFO] OK.");
