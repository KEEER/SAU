const cookie = require('cookie');
const fs = require('fs');
const crypto =  require('crypto');
const utils = require('./utils');
const consts = require('./consts').session;

let _data;

function update() {
  Session.data = Session.data;
}

class Session{
  constructor(req, resp) {
    if(typeof req === typeof "") {
      this.id = req;
      return;
    }
    const cookies = req.headers.cookie || "";
    const sessid = this.id = cookie.parse(cookies)[consts.name];
    if(!Session.hasId(sessid)) {
      const id =this.id = Session.createId();
      resp.setHeader("Set-Cookie",cookie.serialize(consts.name, id,{path:"/"}));
    }
    this.set("created",Date.now());
  }

  set(k,v) {
    Session.data[this.id][k] = v;
    update();
  }

  get(k) {
    return Session.data[this.id][k];
  }

  remove(k){
    if(!k){
      delete Session.data[this.id];
      update();
      return;
    }
    delete (Session.data[this.id])[k];
    update();
  }

  static createId(){
    const id = crypto.randomBytes(consts.length).toString("hex");
    if(Session.hasId(id)) {
      return Session.createId();
    }
    delete Session.data[id];
    Session.data[id] = {
      created: Date.now()
    };
    update();
    return id;
  }

  static hasId(id){
    return typeof _data[id] !== typeof undefined && _data[id].created + consts.expires > Date.now();
  }

  static get data(){
    return _data;
  }

  static set data(data){
    if(!_data){
      _data = data;
      return;
    }
    fs.writeFile(consts.file, JSON.stringify(data), (err) => {
      if (err) console.error(err);
      _data = data;
    });
  }

  static get all() {
    const result = [];
    for(let id in Session.data) {
      if(Session.hasId(id)) {
        result.push(new Session(id));
      }
    }
    return result;
  }
}

try{
  Session.data = JSON.parse(fs.readFileSync(consts.file).toString());
}catch(e){
  Session.data = {};
}

module.exports = Session;

//clean sessions
const clear = () => {
  let count = 0;
  for(let id in Session.data) {
    if(!Session.hasId(id)) { //expired
      delete Session.data[id];
      count++;
    }
  }
  if(count) utils.logEvent({id:"[[Server]]"}, "session:clear", `Cleared ${count} expired session(s)`);
  update();
};
setInterval(clear, consts.clearTimeout);
clear();
