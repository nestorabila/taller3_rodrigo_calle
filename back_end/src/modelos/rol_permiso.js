const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rol_permiso', {
    idrol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rol',
        key: 'idrol'
      }
    },
    idpermiso: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'permiso',
        key: 'idpermiso'
      }
    }
  }, {
    sequelize,
    tableName: 'rol_permiso',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "rol_permiso_pkey",
        unique: true,
        fields: [
          { name: "idrol" },
          { name: "idpermiso" },
        ]
      },
    ]
  });
};
