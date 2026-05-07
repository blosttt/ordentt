const Plantilla = require('../models/Plantilla');

exports.getPlantillas = async (req, res) => {
    try {
        const { usuarioId } = req.query;
        if (!usuarioId) return res.status(400).json({ mensaje: 'usuarioId es requerido' });

        let plantillas = await Plantilla.find({ usuarioId });
        res.json(plantillas);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener plantillas', error: error.message });
    }
};

exports.crearPlantilla = async (req, res) => {
    try {
        const { nombre, implementos, usuarioId } = req.body;
        if (!nombre || !usuarioId) return res.status(400).json({ mensaje: 'Nombre y usuarioId son requeridos' });

        const nuevaPlantilla = new Plantilla({ nombre, implementos: implementos || [], usuarioId });
        await nuevaPlantilla.save();
        res.status(201).json(nuevaPlantilla);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear plantilla', error: error.message });
    }
};

exports.actualizarPlantilla = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, implementos } = req.body;
        
        const plantilla = await Plantilla.findById(id);
        if (!plantilla) return res.status(404).json({ mensaje: 'Plantilla no encontrada' });

        if (nombre) plantilla.nombre = nombre;
        if (implementos) plantilla.implementos = implementos;
        
        await plantilla.save();
        res.json(plantilla);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar plantilla', error: error.message });
    }
};

exports.eliminarPlantilla = async (req, res) => {
    try {
        const { id } = req.params;
        const plantilla = await Plantilla.findByIdAndDelete(id);
        if (!plantilla) return res.status(404).json({ mensaje: 'Plantilla no encontrada' });
        
        res.json({ mensaje: 'Plantilla eliminada' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar plantilla', error: error.message });
    }
};
