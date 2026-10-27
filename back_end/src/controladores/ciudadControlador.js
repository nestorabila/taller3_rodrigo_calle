const { db } = require("../config/database");
const { Op } = require('sequelize');

const listarDepartamento = async (req, res) =>{
    try {
        const lista = await db.departamento.findAll({
        })
        return res.json(lista)
    } catch (error) {
        console.log(error);
        
    }
} 
const listarCiudad = async (req, res) => {
    try {
        const lista = await db.ciudad.findAll({
            include: {model: db.departamento}
        })
        return res.json(lista)
    } catch (error) {
        console.log(error);
        
    }
};
module.exports ={listarCiudad, listarDepartamento}