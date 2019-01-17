const crypto = require('crypto');
const User = require('./user');
const consts = require('./consts').message;
const DB = require('./db');

class Message{
  constructor(id) {
    if(!Message.has(id)) throw new Error("Message not exist");
    this.id = id;
  }

  get(k) {
    return Message.db.data[this.id][k];
  }

  set(k, v) {
    Message.db.data[this.id][k] = v;
    Message.db.update();
  }

  remove(k) {
    if(!k) {
      delete Message.db.data[this.id];
    } else {
      delete Message.db.data[this.id][k];
    }
    Message.db.update();
  }

  get to() {
    switch(this.get("to")) {
      case "officer":
      return "干事";

      case "admin":
      return "管理员";

      default:
      return (new User(this.get("to"))).name;
    }
  }

  set to(to) {
    this.set("to", to);
  }

  get user() {
    return new User(this.userid);
  }

  get from() {
    switch(this.user.role) {
      case "association":
      return this.user.name;

      case "officer":
      return "干事";

      case "admin":
      return "管理员";
    }
  }

  get userid() {
    return this.get("userid");
  }

  set userid(userid) {
    this.set("userid", userid);
  }

  get read() {
    return this.get("read");
  }

  set read(read) {
    this.set("read", read);
  }

  get time() {
    return this.get("time");
  }

  set time(time) {
    this.set("time", time);
  }

  get title() {
    return this.get("title");
  }

  set title(title) {
    this.set("title", title)
  }

  get content() {
    return this.get("content");
  }

  set content(content) {
    this.set("content", content);
  }

  get score() {
    return this.get("score");
  }

  set score(score) {
    this.set("score", score);
  }

  static add(obj) {
    Message.db.data[obj.id] = obj;
    Message.db.update();
    return new Message(obj.id);
  }

  static create(opts) {
    if(!opts) throw new TypeError("Options not defined");
    opts.id = Message.createId();
    opts.time = Date.now();
    return Message.add(opts);
  }

  static has(id) {
    return (id in Message.db.data);
  }

  static createId(){
    const id = crypto.randomBytes(consts.length).toString("hex");
    if(Message.has(id)) {
      return Message.createId();
    }
    delete Message.db.data[id];
    Message.db.update();
    return id;
  }

  static getMessagesById(id) {
    const messages = [];
    for(let i in Message.db.data) {
      if(Message.db.data[i].to === id) {
        messages.push(new Message(i));
      }
    }
    return messages;
  }

  static getMessagesByAuthorId(id) {
    const messages = [];
    for(let i in Message.db.data) {
      if(Message.db.data[i].userid === id) {
        messages.push(new Message(i));
      }
    }
    return messages;
  }

  static getMessagesByType(type) {
    const messages = [];
    for(let i in Message.db.data) {
      const message = new Message(i);
      if(message.user.type === type) {
        messages.push(message);
      }
    }
    return messages;
  }

  static get all() {
    const messages = [];
    for(let i in Message.db.data) {
      messages.push(new Message(i));
    }
    return messages;
  }
}

Message.db = new DB(consts.file);

module.exports = Message;
