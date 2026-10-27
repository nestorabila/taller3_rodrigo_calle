const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('persona', {
    idpersona: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    cedula: {
      type: DataTypes.STRING(15),
      allowNull: true
    },
    nombre: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    ap_paterno: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    ap_materno: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    fotografia: {
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
    correo: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    estado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    idgenero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'genero',
        key: 'idgenero'
      }
    }
  }, {
    sequelize,
    tableName: 'persona',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "persona_pkey",
        unique: true,
        fields: [
          { name: "idpersona" },
        ]
      },
    ]
  });
};
