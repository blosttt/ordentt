const Clinica = require('../models/Clinica');
const Insumo = require('../models/Insumo');
const Usuario = require('../models/Usuario');

exports.getDashboardStats = async (req, res) => {
    try {
        const totalClinicas = await Clinica.countDocuments();
        const totalInsumos = await Insumo.countDocuments();
        const totalUsuarios = await Usuario.countDocuments();

        const clinicas = await Clinica.find().lean();

        res.json({
            totalClinicas,
            totalInsumos,
            totalUsuarios,
            clinicas
        });
    } catch (error) {
        console.error('Error fetching admin dashboard stats:', error);
        res.status(500).json({ mensaje: 'Error al obtener datos del dashboard' });
    }
};
