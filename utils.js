const querystring = require('querystring');
class Utils{
  constructor(){}
  postData(req, parse) {
    return new Promise(function(resolve, reject) {
      let data;
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
}
module.exports = new Utils();
