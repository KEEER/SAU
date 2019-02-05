const fs = require('fs');
const consts = {
  version:"0.1.44",
  http:{
    origin:"https://sau-lab.keeer.net",
    logFile:"access.log",
    realIpHeader:"x-real-ip",
    port:50082,
    staticDir:__dirname+"/source/",
    staticFiles:[
      "index.html",
      "styles.css"
    ],
    staticDirs:[
      "img/"
    ],
    ejsRoot:__dirname+"/source/",
    ejsFiles:[
      "home",
      "home-settings",
      "inbox",
      "report/new",
      "application/new",
      "message/new",
      "settings",
      "messages",
      "about",
      "associations",
      "events",
      "users",
      "user/new"
    ],
    errorMessage:{
      501:"The server has encountered some strange error. Maybe a monster ate the server?",
      404:"404. The page wasn't found by any means.",
      403:"403 Unauthorized. You are not authorized to view this page.",
      400:"400. Your browser has sent us an invalid request, thich we cannot resolve."
    }
  },
  session:{
    file:"session.json",
    name:"SAUSESSID",
    length:64,
    expires:20 * 60 * 1000, // 20 min,
    clearTimeout:10 * 60 * 1000, //20 min
    csrfLength:8,
    csrfEncoding:"base64"
  },
  user:{
    file:"users.json",
    roles:[
      "admin",
      "officer",
      "association"
    ],
    types:[
      "voluntary", //公益
      "academic", //学术
      "scitech", //科技
      "culture", //文化
      "art", //艺术
      "sports", //体育
      "activity", //活动
      "room" //定教室
    ],
    typesReverse:{
      "voluntary":"公益",
      "academic":"学术",
      "scitech":"科技",
      "culture":"文化",
      "art":"艺术",
      "sports":"体育",
      "activity":"活动",
      "room":"定教室"
    },
    hashMethod:"sha256",
    encoding:"base64",
    saltSize:64,
    defaultOptions:{
      admin:{
        name:"管理员",
        id:"admin",
        passwd:"guanli"
      },
      officer:{
        name:"张三",
        id:"zhangsan",
        type:"room",
        passwd:"ganshi"
      },
      association:{
        name:"xx社",
        id:"xxclub",
        type:"voluntary",
        passwd:"shetuan",
        contact:{
          "社长":"班级 姓名 10086",
          "副社长1":"班级 姓名 110",
          "副社长2":"班级 姓名 911"
        }
      }
    }
  },
  report:{
    file:"reports.json",
    length:16
  },
  application:{
    file:"applications.json",
    length:16
  },
  message:{
    file:"messages.json",
    length:16
  },
  files:{
    dir:__dirname + "/files/",
    file:"files.json",
    ext:".file",
    idSize:32,
    idEncoding:"hex",
    maxlength:32 * 1024 * 1024 //32MiB, also change source/partial/upload.ejs
  },
  home:{
    file:"home.json"
  },
  event:{
    logFile:"events.log"
  },
  db:{
    saveInterval:5000 //5 secs
  },
  wechat:{
    sessionFile:__dirname + "/wechat-session.json",
    verifyMsg: "sau32nd"
  }
};
const {staticDir,staticFiles} = consts.http;
consts.http.staticDirs.forEach(dir => {
  const files = fs.readdirSync(staticDir + dir);
  files.forEach(file => {
    staticFiles.push(dir + file);
  });
});

module.exports = consts;
