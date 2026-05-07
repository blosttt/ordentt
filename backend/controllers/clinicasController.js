const Clinica = require('../models/Clinica');

// Función para redondear hora a intervalos de 5 minutos
function redondearHora5Minutos(horaStr) {
    const [horas, minutos] = horaStr.split(':').map(Number);
    const minutosRedondeados = Math.floor(minutos / 5) * 5;
    return `${horas.toString().padStart(2, '0')}:${minutosRedondeados.toString().padStart(2, '0')}`;
}

exports.getClinicas = async (req, res) => {
    try {
        const clinicas = await Clinica.find();
        res.json({ clinicas });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener clínicas', error: error.message });
    }
};

exports.crearClinica = async (req, res) => {
    try {
        const { nombre, diasHorarios, implementosRequeridos } = req.body;
        
        if (!nombre || !diasHorarios || !Array.isArray(diasHorarios)) {
            return res.status(400).json({ mensaje: 'Se requiere nombre y array de días con horarios' });
        }
        
        // Validar horarios (deben ser múltiplos de 5 minutos)
        const horariosValidados = diasHorarios.map(dia => {
            if (!dia.dia || !dia.horaInicio || !dia.horaFin) {
                throw new Error('Cada día debe tener día, hora de inicio y hora de fin');
            }
            
            return {
                dia: dia.dia.toLowerCase(),
                horaInicio: redondearHora5Minutos(dia.horaInicio),
                horaFin: redondearHora5Minutos(dia.horaFin)
            };
        });
        
        const nuevaClinica = new Clinica({
            nombre,
            diasHorarios: horariosValidados,
            implementosRequeridos: implementosRequeridos || [],
            // Todas las clínicas nacen activas por defecto
            activa: true
        });
        
        await nuevaClinica.save();
        res.status(201).json({ mensaje: 'Clínica creada', clinica: nuevaClinica });
    } catch (error) {
        res.status(400).json({ mensaje: 'Error al crear clínica', error: error.message });
    }
};

exports.eliminarClinica = async (req, res) => {
    try {
        const { id } = req.params;
        const clinica = await Clinica.findByIdAndDelete(id);
        
        if (!clinica) {
            return res.status(404).json({ mensaje: 'Clínica no encontrada' });
        }
        
        res.json({ mensaje: `Clínica "${clinica.nombre}" eliminada` });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al eliminar clínica', error: error.message });
    }
};

exports.toggleClinica = async (req, res) => {
    try {
        const { id } = req.params;
        const clinica = await Clinica.findById(id);
        if (!clinica) {
            return res.status(404).json({ mensaje: 'Clínica no encontrada' });
        }
        
        clinica.activa = !clinica.activa;
        await clinica.save();
        
        res.json({
            mensaje: `Clínica ${clinica.activa ? 'activada' : 'desactivada'}: ${clinica.nombre}`,
            clinica
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al cambiar estado de clínica', error: error.message });
    }
};

exports.getClinicaActiva = async (req, res) => {
    try {
        const clinica = await Clinica.findOne({ activa: true });
        res.json({ clinicaActiva: clinica });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener clínica activa', error: error.message });
    }
};
