const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('genero', {
    idgenero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(12),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'genero',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "genero_pkey",
        unique: true,
        fields: [
          { name: "idgenero" },
        ]
      },
    ]
  });
};
