const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('caso', {
    idcaso: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    denunciante: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    denunciado: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    idpersona: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'persona',
        key: 'idpersona'
      }
    },
    idtipo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tipo',
        key: 'idtipo'
      }
    },
    archivo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false
    },
    estado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'caso',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "caso_pkey",
        unique: true,
        fields: [
          { name: "idcaso" },
        ]
      },
    ]
  });
};
