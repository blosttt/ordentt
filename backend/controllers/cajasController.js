const Caja = require('../models/Caja');

function generarSlug(nombre) {
    return nombre.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
}

// Cajas por defecto si el usuario es nuevo
const CAJAS_POR_DEFECTO = [
    { nombre: 'Mis Cosas', slug: 'mis_cosas', fija: true }, // Fija en lógica, aunque se puede omitir si se trata igual
    { nombre: 'Central Esterilización', slug: 'central_esterilizacion', fija: true },
    { nombre: 'Locker Universidad', slug: 'locker_universidad', fija: false },
    { nombre: 'Cajón Bandeja', slug: 'cajon_bandeja', fija: false },
    { nombre: 'Cajón Casa', slug: 'cajon_casa', fija: false },
    { nombre: 'En Consulta', slug: 'en_consulta', fija: false },
    { nombre: 'Bodega Clínica', slug: 'bodega_clinica', fija: false }
];

exports.getCajas = async (req, res) => {
    try {
        const { usuarioId } = req.query;
        if (!usuarioId) return res.status(400).json({ mensaje: 'usuarioId es requerido' });

        let cajas = await Caja.find({ usuarioId });

        // Auto-crear cajas por defecto si no tiene
        if (cajas.length === 0) {
            const cajasNuevas = CAJAS_POR_DEFECTO.map(c => ({
                ...c,
                usuarioId
            }));
            await Caja.insertMany(cajasNuevas);
            cajas = await Caja.find({ usuarioId });
        }

        res.json(cajas);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener cajas', error: error.message });
    }
};

exports.crearCaja = async (req, res) => {
    try {
        const { nombre, usuarioId } = req.body;
        if (!nombre || !usuarioId) return res.status(400).json({ mensaje: 'Faltan datos' });

        let slug = generarSlug(nombre);
        
        // Evitar duplicados de slug agregando sufijo si existe
        let existente = await Caja.findOne({ usuarioId, slug });
        if (existente) {
            slug = `${slug}_${Date.now()}`;
        }

        const nuevaCaja = new Caja({ nombre, slug, usuarioId, fija: false });
        await nuevaCaja.save();
        res.status(201).json(nuevaCaja);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al crear caja', error: error.message });
    }
};

exports.actualizarCaja = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        
        const caja = await Caja.findById(id);
        if (!caja) return res.status(404).json({ mensaje: 'Caja no encontrada' });
        if (caja.fija) return res.status(400).json({ mensaje: 'No puedes editar una caja fija' });

        caja.nombre = nombre;
        // No actualizamos el slug para no romper relaciones existentes (Insumos que ya usan este slug)
        // o si lo actualizamos, tendríamos que actualizar todos los insumos. Mejor mantener slug fijo.
        
        await caja.save();
        res.json(caja);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar caja', error: error.message });
    }
};

exports.eliminarCaja = async (req, res) => {
    try {
        const { id } = req.params;
        const caja = await Caja.findById(id);
        if (!caja) return res.status(404).json({ mensaje: 'Caja no encontrada' });
        if (caja.fija) return res.status(400).json({ mensaje: 'No puedes eliminar una caja fija' });

        // Idealmente verificar si hay insumos en esta caja y moverlos a "mis_cosas"
        const Insumo = require('../models/Insumo');
        await Insumo.updateMany(
            { usuarioId: caja.usuarioId, ubicacionActual: caja.slug },
            { $set: { ubicacionActual: 'mis_cosas' } }
        );

        await Caja.findByIdAndDelete(id);
        res.json({ mensaje: 'Caja eliminada y sus insumos movidos a Mis Cosas' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar caja', error: error.message });
    }
};
