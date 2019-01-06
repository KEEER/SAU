class Home {
  constructor() {}
  get carousel() {
    // TODO
    return [
      {
        link:"https://about.keeer.net/256/",
        img:"https://i.loli.net/2019/01/06/5c31abd4192a6.jpg"
      },
      {
        link:"https://gejia.rdfzsu.org/",
        img:"https://i.loli.net/2019/01/06/5c31abd61ee43.jpg"
      }
    ];
  }
  get links() {
    // TODO
    return [
      {
        link:"https://about.keeer.net/256/",
        title:"256"
      },
      {
        link:"https://gejia.rdfzsu.org/",
        title:"gejia"
      }
    ];
  }
}

module.exports = new Home();
