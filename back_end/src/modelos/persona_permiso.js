const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('persona_permiso', {
    idpersona: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'persona',
        key: 'idpersona'
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
    },
    tipo: {
      type: DataTypes.CHAR(1),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'persona_permiso',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "persona_permiso_pkey",
        unique: true,
        fields: [
          { name: "idpersona" },
          { name: "idpermiso" },
        ]
      },
    ]
  });
};
