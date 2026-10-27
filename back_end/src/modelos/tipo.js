const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('tipo', {
    idtipo: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'tipo',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "tipo_pkey",
        unique: true,
        fields: [
          { name: "idtipo" },
        ]
      },
    ]
  });
};
