const fs = require('fs');
const crypto = require('crypto');
const User = require('./user');
const consts = require('./consts').report;
const DB = require('./db');

class Report{
  constructor(id) {
    if(!Report.has(id)) throw new Error("Report not exist");
    this.id = id;
  }

  get(k) {
    return Report.db.data[this.id][k];
  }

  set(k, v) {
    Report.db.data[this.id][k] = v;
    Report.db.update();
  }

  get user() {
    return new User(this.userid);
  }

  get name() {
    return this.user.name;
  }

  get size() {
    return this.get("size");
  }

  set size(size) {
    this.set("size", size);
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

  get description() {
    return this.get("description");
  }

  set description(description) {
    this.set("description", description);
  }

  get checkedsize() {
    return this.get("checkedsize");
  }

  set checkedsize(checkedsize) {
    this.set("checkedsize", checkedsize);
  }

  get score() {
    return this.get("score");
  }

  set score(score) {
    this.set("score", score);
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
    Report.db.data[obj.id] = obj;
    update();
    return new Report(obj.id);
  }

  static create(opts) {
    if(!opts) throw new TypeError("Options not defined");
    opts.id = Report.createId();
    opts.stime = Date.now();
    return Report.add(opts);
  }

  static has(id) {
    return (id in Report.db.data);
  }

  static createId(){
    const id = crypto.randomBytes(consts.length).toString("hex");
    if(Report.has(id)) {
      return Report.createId();
    }
    delete Report.db.data[id];
    Report.db.update();
    return id;
  }

  static getReportsById(id) {
    const reports = [];
    for(let i in Report.db.data) {
      if(Report.db.data[i].userid === id) {
        reports.push(new Report(i));
      }
    }
    return reports;
  }

  static getReportsByType(type) {
    const reports = [];
    for(let i in Report.db.data) {
      const report = new Report(i);
      if(report.user.type === type) {
        reports.push(report);
      }
    }
    return reports;
  }

  static get all() {
    const reports = [];
    for(let i in Report.db.data) {
      reports.push(new Report(i));
    }
    return reports;
  }
}

Report.db = new DB(consts.file);

module.exports = Report;
