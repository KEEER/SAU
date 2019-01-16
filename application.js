const crypto = require('crypto');
const User = require('./user');
const DB = require('./db');
const consts = require('./consts').application;

class Application{
  constructor(id) {
    if(!Application.has(id)) throw new Error("Application not exist");
    this.id = id;
  }

  get(k) {
    return Application.db.data[this.id][k];
  }

  set(k, v) {
    Application.db.data[this.id][k] = v;
    Application.db.update();
  }

  get user() {
    return new User(this.userid);
  }

  get name() {
    return this.user.name;
  }

  get type() {
    return this.get("type");
  }

  set type(size) {
    this.set("type", type);
  }

  get userid() {
    return this.get("userid");
  }

  set userid(userid) {
    this.set("userid", userid);
  }

  get title() {
    return this.get("title");
  }

  set title(title) {
    this.set("title", title)
  }

  get begin() {
    return this.get("begin");
  }

  set begin(begin) {
    this.set("begin", begin);
  }

  get time() {
    return this.get("time");
  }

  set time(time) {
    this.set("time", time);
  }

  get place() {
    return this.get("place");
  }

  set place(place) {
    this.set("place", place);
  }

  get times() {
    return [
      this.get("time1"),
      this.get("time2"),
      this.get("time3")
    ];
  }

  get places() {
    return [
      this.get("place1"),
      this.get("place2"),
      this.get("place3")
    ];
  }

  get reply() {
    return this.get("reply");
  }

  set reply(reply) {
    this.set("reply", reply);
  }

  get score() {
    return this.get("score");
  }

  set score(score) {
    this.set("score", score);
  }

  get description() {
    return this.get("description");
  }

  set description(description) {
    this.set("description", description);
  }

  get files() {
    return this.get("files");
  }

  set files(files) {
    this.set("files", files);
  }

  get stime() {
    return this.get("stime");
  }

  static add(obj) {
    Application.db.data[obj.id] = obj;
    update();
    return new Application(obj.id);
  }

  static create(opts) {
    if(!opts) throw new TypeError("Options not defined");
    opts.id = Application.createId();
    opts.stime = Date.now();
    return Application.add(opts);
  }

  static has(id) {
    return (id in Application.db.data);
  }

  static createId(){
    const id = crypto.randomBytes(consts.length).toString("hex");
    if(Application.has(id)) {
      return Application.createId();
    }
    delete Application.db.data[id];
    update();
    return id;
  }

  static getApplicationsById(id) {
    const applications = [];
    for(let i in Application.db.data) {
      if(Application.db.data[i].userid === id) {
        applications.push(new Application(i));
      }
    }
    return applications;
  }

  static getApplicationsByType(type) {
    const applications = [];
    for(let i in Application.db.data) {
      const application = new Application(i);
      if(application.user.type === type || (application.type === "room" && type === "room")) {
        applications.push(application);
      }
    }
    return applications;
  }

  static get all() {
    const applications = [];
    for(let i in Application.db.data) {
      applications.push(new Application(i));
    }
    return applications;
  }
}

Application.db = new DB(consts.file);

module.exports = Application;
