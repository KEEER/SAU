const fs = require('fs');
const consts = require('./consts').report;

let _data;

function update() {
  Report.data = Report.data;
}

class Report{
  constructor(id) {
    if(!Report.has(id)) throw new Error("Report not exist");
    this.id = id;
  }

  get(k) {
    return Report.data[this.id][k];
  }

  set(k, v) {
    Report.data[this.id][k] = v;
    update();
  }

  get name() {
    return this.get("name");
  }

  set name(name) {
    this.set("name", name);
  }

  get size() {
    return this.get("size");
  }

  set size(size) {
    this.set("size", size);
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

  get content() {
    return this.get("content");
  }

  set content(content) {
    this.set("content", content);
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

  static add(obj) {
    Report.data[obj.id] = obj;
    update();
    return new Report(obj.id);
  }

  static create(opts) {
    if(!opts) throw new TypeError("Options not defined");
    return Report.add(obj);
  }

  static has(id) {
    return (id in Report.data);
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
}
