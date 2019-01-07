const fs = require('fs');
const consts = {
  http:{
    port: 50082,
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
      "associations"
    ],
    errorMessage:{
      501:"The server has encountered some strange error. Maybe a monster ate the server?",
      404:"404. The page wasn't found by any means."
    }
  },
  session:{
    file:"session.json",
    name:"sau-sessid",
    length:64,
    expires:20 * 60 * 1000 // 20 min
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
        passwd:"shetuan"
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
  association:{
    types:{
      "voluntary":"公益",
      "academic":"学术",
      "scitech":"科技",
      "culture":"文化",
      "art":"艺术",
      "sports":"体育",
      "activity":"活动"
    }
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
