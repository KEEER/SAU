const cookie = require('cookie');
const fs = require('fs');
const crypto =  require('crypto');
const utils = require('./utils');
const consts = require('./consts').session;

class Session{
  constructor(req, resp) {
    if(typeof req === typeof "") {
      this.id = req;
      return;
    }
    const cookies = req.headers.cookie || "";
    const sessid = this.id = cookie.parse(cookies)[consts.name];
    if(!Session.hasId(sessid)) {
      const id = this.id = Session.createId();
      resp.setHeader("Set-Cookie",cookie.serialize(consts.name, id,{path:"/"}));
    }
    this.set("created", Date.now());
  }

  set(k,v) {
    Session.db.data[this.id][k] = v;
    Session.db.update();
  }

  get(k) {
    return Session.db.data[this.id][k];
  }

  remove(k) {
    if(!k) {
      delete Session.db.data[this.id];
      Session.db.update();
      return;
    }
    delete (Session.db.data[this.id])[k];
    Session.db.update();
  }

  getCsrfToken(path) {
    const existingToken = this.get("csrf." + path);
    if(existingToken) {
      return existingToken;
    }
    const token = crypto.randomBytes(consts.csrfLength).toString(consts.csrfEncoding);
    this.set("csrf." + path, token);
    return token;
  }

  verifyCsrfToken(path, token) {
    const _token = this.get("csrf." + path);
    if(_token && _token === token) {
      this.remove("csrf." + path);
      return true;
    } else return false;
  }

  static createId(){
    const id = crypto.randomBytes(consts.length).toString("hex");
    if(Session.hasId(id)) {
      return Session.createId();
    }
    delete Session.db.data[id];
    Session.db.data[id] = {
      created: Date.now()
    };
    Session.db.update();
    return id;
  }

  static hasId(id){
    return typeof Session.db.data[id] !== typeof undefined && Session.db.data[id].created + consts.expires > Date.now();
  }

  static get all() {
    const result = [];
    for(let id in Session.db.data) {
      if(Session.hasId(id)) {
        result.push(new Session(id));
      }
    }
    return result;
  }
}

module.exports = Session;
const DB = require('./db');
Session.db = new DB(consts.file);

//clean sessions
const clear = () => {
  let count = 0;
  for(let id in Session.db.data) {
    if(!Session.hasId(id)) { //expired
      delete Session.db.data[id];
      count++;
    }
  }
  if(count){
    utils.logEvent({id:"[[Server]]"}, "session:clear", `Cleared ${count} expired session(s)`);
    Session.db.update();
  }
};
setInterval(clear, consts.clearTimeout);
clear();
