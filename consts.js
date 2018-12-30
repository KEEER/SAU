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
