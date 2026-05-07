const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    try {
        let uri = process.env.MONGO_URI;

        // Si no se configuró un URI real en la nube, usamos una base de datos en memoria (ideal para desarrollo local)
        if (!uri || uri.includes('127.0.0.1') || uri.includes('localhost')) {
            console.log('🔄 Iniciando base de datos en memoria (MongoMemoryServer) para desarrollo local...');
            const mongoServer = await MongoMemoryServer.create();
            uri = mongoServer.getUri();
        }

        await mongoose.connect(uri);
        console.log(`✅ MongoDB conectado exitosamente en la memoria local`);
        
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