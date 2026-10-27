const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rol_persona', {
    idpersona: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'persona',
        key: 'idpersona'
      }
    },
    idrol: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rol',
        key: 'idrol'
      }
    }
  }, {
    sequelize,
    tableName: 'rol_persona',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "rol_persona_pkey",
        unique: true,
        fields: [
          { name: "idrol" },
          { name: "idpersona" },
        ]
      },
    ]
  });
};
