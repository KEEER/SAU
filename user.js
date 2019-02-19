const fs = require('fs');
const crypto = require('crypto');
const consts = require('./consts').user;

class User{
  constructor(id) {
    if(!User.has(id)) throw new Error("User not exist");
    this.id = id;
  }

  get(k) {
    return User.db.data[this.id][k];
  }

  set(k, v) {
    User.db.data[this.id][k] = v;
    User.db.update();
  }

  // TODO: score, reports, apps & msgs
  get score() {
    let score = 0;
    this.reports.forEach(el => {
      score += (el.score || 0);
    });
    this.messagesReceived.forEach(el => {
      score += (el.score || 0);
    });
    this.applications.forEach(el => {
      score += (el.score || 0);
    });
    return score;
  }

  get reports() {
    switch(this.role) {
      case "association":
      return Report.getReportsById(this.id);

      case "officer":
      return Report.getReportsByType(this.type);

      case "admin":
      return Report.all;
    }
  }

  get applications() {
    switch(this.role) {
      case "association":
      return Application.getApplicationsById(this.id);

      case "officer":
      return Application.getApplicationsByType(this.type);

      case "admin":
      return Application.all;
    }
  }

  get messagesReceived() {
    switch(this.role) {
      case "association":
      return Message.getMessagesById(this.id);

      case "officer":
      return Message.getMessagesByType(this.type).filter(msg => {
        return msg.to === "officer";
      });

      case "admin":
      return Message.getMessagesById(this.id);
    }
  }

  get messagesSent() {
    return Message.getMessagesByAuthorId(this.id);
  }

  get name() {
    return this.get("name");
  }

  set name(name) {
    this.set("name", name);
  }

  get contact() {
    return this.get("contact");
  }

  set contact(contact) {
    this.set("contact", contact);
  }

  get salt() {
    return this.get("salt");
  }

  set salt(salt) {
    this.set("salt", salt);
  }

  get passwd() {
    return this.get("passwd");
  }

  set passwd(passwd) {
    this.set("passwd", passwd.toString());
  }

  isValidPasswd(passwd) {
    return crypto.timingSafeEqual(
      User.hash(passwd, this.salt),
      Buffer.from(this.passwd)
    );
  }

  generateSalt() {
    return this.salt = User.generateSalt();
  }

  get role() {
    return this.get("role");
  }

  set role(role) {
    if(!User.isValidRole(role)) throw new Error("Not an valid role");
    this.set("role", role);
  }

  get type() {
    if(User.role === "admin") throw new Error("No type for admin");
    return this.get("type");
  }

  set type(type) {
    if(User.role === "admin") throw new Error("No type for admin");
    if(!User.isValidType(type)) throw new Error("Not valid type");
    if(this.role === "association" && type === "room") throw new Error("Assoc cannot be of type room");
    this.set("type", type);
  }

  static generateSalt() {
    return crypto.randomBytes(consts.saltSize).toString(consts.encoding);
  }

  static isValidRole(_role) {
    let valid = false;
    consts.roles.forEach(role => {
      if(role === _role) {
        valid = true;
      }
    });
    return valid;
  }

  static isValidType(_type) {
    let valid = false;
    consts.types.forEach(type => {
      if(type === _type) {
        valid = true;
      }
    });
    return valid;
  }

  static hash(passwd, salt) {
    const hash = crypto.createHash(consts.hashMethod);
    hash.update(passwd + salt);
    return Buffer.from(hash.digest(consts.encoding));
  }

  static add(obj) {
    User.db.data[obj.id] = obj;
    User.db.update();
    return new User(obj.id);
  }

  static create(opts) {
    if(!opts) throw new TypeError("Options not defined");
    if(!User.isValidRole(opts.role)) throw new TypeError("Illegal role");
    const obj = Object.assign({}, consts.defaultOptions[opts.role], opts);
    if(!obj.salt) {
      obj.salt = User.generateSalt();
    }
    obj.passwd = User.hash(obj.passwd, obj.salt).toString();
    return User.add(obj);
  }

  static has(id) {
    return (id in User.db.data);
  }

  static get data() {
    return User.db.data;
  }

  static set data(data) {
    if(!User.db.data){
      User.db.data = data;
      return;
    }
    fs.writeFile(consts.file, JSON.stringify(data), (err) => {
      if (err) console.error(err);
      User.db.data = data;
    });
  }

  static get all() {
    const users = [];
    for(let i in User.db.data) {
      users.push(new User(i));
    }
    return users;
  }
}

module.exports = User;
const DB = require('./db');
User.db = new DB(consts.file);

//To avoid Report require('./user') only to get {},
//we need to import ./report at last
const Report = require('./report');
const Application = require('./application');
const Message = require('./message');
