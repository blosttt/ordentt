const mongoose = require('mongoose');

const clinicaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    diasHorarios: [{
        dia: { type: String, required: true },
        horaInicio: { type: String, required: true },
        horaFin: { type: String, required: true }
    }],
    implementosRequeridos: [{
        nombre: { type: String, required: true },
        cantidad: { type: Number, required: true, default: 1 }
    }],
    activa: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Clinica', clinicaSchema);
