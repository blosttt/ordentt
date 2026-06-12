const Insumo = require('../models/Insumo');

// Obtener todos los insumos
exports.getInsumos = async (req, res) => {
    try {
        const insumos = await Insumo.find().sort({ ultimaActualizacion: -1 });
        res.json(insumos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear nuevo insumo
exports.createInsumo = async (req, res) => {
    try {
        const insumo = new Insumo(req.body);
        await insumo.save();
        res.status(201).json(insumo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Actualizar ubicación y estado
exports.updateUbicacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { ubicacion, estado } = req.body;

        const insumo = await Insumo.findById(id);

        // Guardar en historial
        insumo.historial.push({
            estado: estado || insumo.estado,
            ubicacion: ubicacion
        });

        insumo.ubicacion = ubicacion;
        if (estado) insumo.estado = estado;
        insumo.ultimaActualizacion = Date.now();

        await insumo.save();
        res.json(insumo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Marcar como esterilizado
exports.esterilizar = async (req, res) => {
    try {
        const { id } = req.params;
        const fechaEsterilizacion = new Date();
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 7); // Vence en 7 días

        const insumo = await Insumo.findByIdAndUpdate(id, {
            estado: 'esterilizado',
            fechaEsterilizacion,
            fechaVencimiento,
            ultimaActualizacion: Date.now()
        }, { new: true });

        res.json(insumo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};