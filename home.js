const consts = require('./consts').home;
const fs = require('fs');

let _data;

function update() {
  Home.data = Home.data;
}

class Home {
  constructor() {}
  get carousel() {
    return Home.data.carousel;
  }
  set carousel(data) {
    Home.data.carousel = data;
    update();
  }

  get links() {
    // TODO
    return Home.data.links;
  }
  set links(data) {
    Home.data.links = data;
    update();
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

try{
  Home.data = JSON.parse(fs.readFileSync(consts.file).toString());
}catch(e){
  Home.data = {};
}

module.exports = new Home();
