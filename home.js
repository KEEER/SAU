const consts = require('./consts').home;
const DB = require('./db');

class Home {
  constructor() {}

  get carousel() {
    return Home.db.data.carousel || [];
  }

  set carousel(data) {
    Home.db.data.carousel = data;
    Home.db.update();
  }

  get links() {
    return Home.db.data.links || [];
  }

  set links(data) {
    Home.db.data.links = data;
    Home.db.update();
  }
}
Home.db = new DB(consts.file);

module.exports = new Home();
