const fs = require('fs');
const {promisify} = require('util');
const consts = require('./consts').db;

class DB{
  constructor(filename, asyncLoad) {
    this.filename = filename;
    this.setInterval();
    process.nextTick(() => onExit(() => this.saveDataSync()));
    try {
      if(asyncLoad) this.loadData();
      else this.loadDataSync();
    } catch(e) {
      this.data = {};
    }
  }

  async saveData() {
    if(!this.updated || this.updating || !this.initialized) return;
    this.updated = false;
    this.updating = true;
    try {
      await promisify(fs.writeFile)(this.filename, JSON.stringify(this.data));
    } catch(e) {
      logEvent({id:"[[Server]]"},
                "db:errupd",
                `Failed to update ${this.filename}:\n${err.stack}`);
    } finally {
      this.updating = false;
    }
  }

  saveDataSync() {
    fs.writeFileSync(this.filename, JSON.stringify(this.data));
  }

  setInterval() {
    if(this.intervalId) return;
    this.intervalId = setInterval(async() => await this.saveData(), consts.saveInterval);
  }

  clearInterval() {
    clearInterval(this.intervalId);
    delete this.intervalId;
  }

  update() {
    this.updated = true;
  }

  async loadData() {
    try {
      this.data = JSON.parse(await promisify(fs.readFile)(this.filename));
    } catch(e) {
      this.data = {};
    } finally {
      this.initialized = true;
    }
  }

  loadDataSync() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.filename));
    } catch(e) {
      this.data = {};
    } finally {
      this.initialized = true;
    }
  }
}

module.exports = DB;

// require('./utils') at last to prevent cross-dependency problems
const {logEvent, onExit} = require('./utils');
