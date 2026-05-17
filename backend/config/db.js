const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI;

        if (!uri) {
            console.error('❌ Error: No se ha definido MONGO_URI en el archivo .env');
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log(`✅ MongoDB conectado exitosamente a ${uri}`);
        
        // Crear usuario administrador por defecto
        const Usuario = require('../models/Usuario');
        const adminExiste = await Usuario.findOne({ carnet: 'admin' });
        if (!adminExiste) {
            const nuevoAdmin = new Usuario({
                nombre: 'Administrador',
                carnet: 'admin',
                password: '1234'
            });
            await nuevoAdmin.save();
            console.log('✅ Usuario Administrador creado (admin / 1234)');
        }
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB;