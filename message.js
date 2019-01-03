const fs = require('fs');
const crypto = require('crypto');
const User = require('./user');
const consts = require('./consts').message;

let _data;

function update() {
  Message.data = Message.data;
}

class Message{
  constructor(id) {
    if(!Message.has(id)) throw new Error("Message not exist");
    this.id = id;
  }

  get(k) {
    return Message.data[this.id][k];
  }

  set(k, v) {
    Message.data[this.id][k] = v;
    update();
  }

  get to() {
    return this.get("to");
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
    Message.data[obj.id] = obj;
    update();
    return new Message(obj.id);
  }

  static create(opts) {
    if(!opts) throw new TypeError("Options not defined");
    opts.id = Message.createId();
    opts.time = Date.now();
    return Message.add(opts);
  }

  static has(id) {
    return (id in Message.data);
  }

  static createId(){
    const id = crypto.randomBytes(consts.length).toString("hex");
    if(Message.has(id)) {
      return Message.createId();
    }
    delete Message.data[id];
    update();
    return id;
  }

  static get data() {
    return _data;
  }

  static set data(data) {
    if(!_data){
      _data = data;
      return;
    }
    fs.writeFile(consts.file, JSON.stringify(data), (err) => {
      if (err) console.error(err);
      _data = data;
    });
  }

  static getMessagesById(id) {
    const messages = [];
    for(let i in Message.data) {
      if(Message.data[i].to === id) {
        messages.push(new Message(i));
      }
    }
    return messages;
  }

  static getMessagesByAuthorId(id) {
    const messages = [];
    for(let i in Message.data) {
      if(Message.data[i].userid === id) {
        messages.push(new Message(i));
      }
    }
    return messages;
  }

  static getMessagesByType(type) {
    const messages = [];
    for(let i in Message.data) {
      const message = new Message(i);
      if(message.user.type === type) {
        messages.push(message);
      }
    }
    return messages;
  }

  static get all() {
    const messages = [];
    for(let i in Message.data) {
      messages.push(new Message(i));
    }
    return messages;
  }
}

try{
  Message.data = JSON.parse(fs.readFileSync(consts.file).toString());
}catch(e){
  Message.data = {};
}

module.exports = Message;
