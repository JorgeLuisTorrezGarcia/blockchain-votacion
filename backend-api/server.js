const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/database');

// Registrar modelos para que Sequelize los conozca antes del sync
require('./models/User');
require('./models/AdminAction');
require('./models/Election');
require('./models/Notification');

const apiRoutes = require('./routes');

const PORT = process.env.PORT || 4000;
const app = express();

// --- Conexión a DB y Sincronización de Modelos ---
connectDB();

// --- Middlewares ---
app.use(cors({
    origin: 'http://localhost:3000' // Permitir solo al frontend Next.js
}));
app.use(express.json()); // Permite manejar JSON en las peticiones

// --- Rutas ---
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send(`API de Votación corriendo en el puerto ${PORT}`);
});

// --- Inicio del Servidor ---
app.listen(PORT, () => {
    console.log(`📡 Servidor Backend corriendo en http://localhost:${PORT}`);
});