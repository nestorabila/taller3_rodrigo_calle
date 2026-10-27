var DataTypes = require("sequelize").DataTypes;
var _caso = require("./caso");
var _credencial = require("./credencial");
var _genero = require("./genero");
var _permiso = require("./permiso");
var _persona = require("./persona");
var _persona_permiso = require("./persona_permiso");
var _rol = require("./rol");
var _rol_permiso = require("./rol_permiso");
var _rol_persona = require("./rol_persona");
var _tipo = require("./tipo");

function initModels(sequelize) {
  var caso = _caso(sequelize, DataTypes);
  var credencial = _credencial(sequelize, DataTypes);
  var genero = _genero(sequelize, DataTypes);
  var permiso = _permiso(sequelize, DataTypes);
  var persona = _persona(sequelize, DataTypes);
  var persona_permiso = _persona_permiso(sequelize, DataTypes);
  var rol = _rol(sequelize, DataTypes);
  var rol_permiso = _rol_permiso(sequelize, DataTypes);
  var rol_persona = _rol_persona(sequelize, DataTypes);
  var tipo = _tipo(sequelize, DataTypes);

  permiso.belongsToMany(persona, {  through: persona_permiso, foreignKey: "idpermiso", otherKey: "idpersona" });
  permiso.belongsToMany(rol, {  through: rol_permiso, foreignKey: "idpermiso", otherKey: "idrol" });
  persona.belongsToMany(permiso, {  through: persona_permiso, foreignKey: "idpersona", otherKey: "idpermiso" });
  persona.belongsToMany(rol, { as: 'rol',  through: rol_persona, foreignKey: "idpersona", otherKey: "idrol" });
  rol.belongsToMany(permiso, {  through: rol_permiso, foreignKey: "idrol", otherKey: "idpermiso" });
  rol.belongsToMany(persona, {  through: rol_persona, foreignKey: "idrol", otherKey: "idpersona" });
  persona.belongsTo(genero, {  foreignKey: "idgenero"});
  genero.hasMany(persona, {  foreignKey: "idgenero"});
  persona_permiso.belongsTo(permiso, {  foreignKey: "idpermiso"});
  permiso.hasMany(persona_permiso, {  foreignKey: "idpermiso"});
  rol_permiso.belongsTo(permiso, {  foreignKey: "idpermiso"});
  permiso.hasMany(rol_permiso, {  foreignKey: "idpermiso"});
  caso.belongsTo(persona, {  foreignKey: "idpersona"});
  persona.hasMany(caso, {  foreignKey: "idpersona"});
  credencial.belongsTo(persona, {  foreignKey: "idpersona"});
  persona.hasOne(credencial, {  foreignKey: "idpersona"});
  persona_permiso.belongsTo(persona, { foreignKey: "idpersona"});
  persona.hasMany(persona_permiso, {  foreignKey: "idpersona"});
  rol_persona.belongsTo(persona, {  foreignKey: "idpersona"});
  persona.hasMany(rol_persona, { foreignKey: "idpersona"});
  rol_permiso.belongsTo(rol, {  foreignKey: "idrol"});
  rol.hasMany(rol_permiso, {  foreignKey: "idrol"});
  rol_persona.belongsTo(rol, {  foreignKey: "idrol"});
  rol.hasMany(rol_persona, { foreignKey: "idrol"});
  caso.belongsTo(tipo, { foreignKey: "idtipo"});
  tipo.hasMany(caso, {  foreignKey: "idtipo"});

  return {
    caso,
    credencial,
    genero,
    permiso,
    persona,
    persona_permiso,
    rol,
    rol_permiso,
    rol_persona,
    tipo,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
