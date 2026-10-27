const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('credencial', {
    usuario: {
      type: DataTypes.STRING(30),
      allowNull: false,
      primaryKey: true
    },
    contrasena: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    idpersona: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'persona',
        key: 'idpersona'
      },
      unique: "credencial_idpersona_key"
    }
  }, {
    sequelize,
    tableName: 'credencial',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "credencial_idpersona_key",
        unique: true,
        fields: [
          { name: "idpersona" },
        ]
      },
      {
        name: "credencial_pkey",
        unique: true,
        fields: [
          { name: "usuario" },
        ]
      },
    ]
  });
};
