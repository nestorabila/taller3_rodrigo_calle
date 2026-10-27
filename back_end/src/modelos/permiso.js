const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('permiso', {
    idpermiso: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "permiso_codigo_key"
    },
    descripcion: {
      type: DataTypes.STRING(200),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'permiso',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "permiso_codigo_key",
        unique: true,
        fields: [
          { name: "codigo" },
        ]
      },
      {
        name: "permiso_pkey",
        unique: true,
        fields: [
          { name: "idpermiso" },
        ]
      },
    ]
  });
};
