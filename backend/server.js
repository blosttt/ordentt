const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Configuración de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Conectar a la base de datos
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Rutas de la API
const authMiddleware = require('./middleware/authMiddleware');

app.use('/api/usuarios', require('./routes/usuariosRoutes'));
app.use('/api/configuracion/clinicas', authMiddleware, require('./routes/clinicasRoutes'));
app.use('/api/insumos', authMiddleware, require('./routes/insumosRoutes'));
app.use('/api/solicitudes', authMiddleware, require('./routes/solicitudesRoutes'));
app.use('/api/cajas', authMiddleware, require('./routes/cajasRoutes'));
app.use('/api/plantillas', authMiddleware, require('./routes/plantillasRoutes'));
app.use('/api/logs', authMiddleware, require('./routes/logsRoutes'));
app.use('/api/admin', authMiddleware, require('./routes/adminRoutes'));

// Fallback para SPA (si fuera necesario, aquí servimos el index para rutas no encontradas)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});