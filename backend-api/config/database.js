const { Sequelize } = require('sequelize');
require('dotenv').config();

// Inicialización de la conexión con Sequelize (ORM)
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: "postgres",
        dialectModule: pg,
        logging: false // Deshabilita la impresión de consultas SQL en consola
    }
);

/**
 * Función para probar la conexión a la base de datos.
 */
async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida con éxito.');
        // Sincronizar modelos (crea las tablas si no existen)
        await sequelize.sync({ alter: true }); // Usamos alter para modificar tablas existentes sin perder datos
        console.log('✅ Modelos de DB sincronizados.');
    } catch (error) {
        console.error('❌ Error al conectar o sincronizar la DB:', error);
        // Salir de la aplicación si la DB no está disponible
        process.exit(1); 
    }
}

module.exports = { sequelize, connectDB };
