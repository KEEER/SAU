const fs = require('fs');
const crypto = require('crypto');
const consts = require('./consts').user;

let _data;

function update() {
  User.data = User.data;
}

class User{
  constructor(id) {
    if(!User.has(id)) throw new Error("User not exist");
    this.id = id;
  }

  get(k) {
    return User.data[this.id][k];
  }

  set(k, v) {
    User.data[this.id][k] = v;
    update();
  }

  // TODO: score, reports, apps & msgs
  get score() {
    return 512;
  }

  get reports() {
    return [];
  }

  get applications() {
    return [];
  }

  get messages() {
    return [];
  }

  get name() {
    return this.get("name");
  }

  set name(name) {
    this.set("name", name);
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
    this.set("passwd", passwd);
  }

  isValidPasswd(passwd) {
    return crypto.timingSafeEqual(
      User.hash(passwd, this.salt),
      Buffer.from(this.passwd)
    );
  }

  generateSalt() {
    this.salt = User.generateSalt();
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
    User.data[obj.id] = obj;
    update();
    return new User(obj.id);
  }

  static create(opts) {
    if(!opts) throw new TypeError("Options not defined");
    if(!User.isValidRole(opts.role)) throw new TypeError("Illegal role");
    const obj = Object.assign(consts.defaultOptions[opts.role], opts);
    if(!obj.salt) {
      obj.salt = User.generateSalt();
    }
    obj.passwd = User.hash(obj.passwd, obj.salt);
    return User.add(obj);
  }

  static has(id) {
    return (id in User.data);
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
  User.data = JSON.parse(fs.readFileSync(consts.file).toString());
}catch(e){
  User.data = {};
}

module.exports = User;
