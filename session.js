const cookie = require('cookie');
const fs = require('fs');
const crypto =  require('crypto');
const consts = require('./consts').session;

let _data;

function update() {
  Session.data = Session.data;
}

class Session{
  constructor(req, resp) {
    const cookies = req.headers.cookie || "";
    const sessid = this.id = cookie.parse(cookies)[consts.name];
    if(!Session.hasId(sessid)) {
      const id =this.id = Session.createId();
      resp.setHeader("Set-Cookie",cookie.serialize(consts.name, id));
    }
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
}

try{
  Session.data = JSON.parse(fs.readFileSync(consts.file).toString());
}catch(e){
  Session.data = {};
}

module.exports = Session;
