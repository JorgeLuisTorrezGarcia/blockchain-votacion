const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

/**
 * Script para crear usuario administrador por defecto
 * Uso: node scripts/seed-admin.js
 */
async function seedAdmin() {
  try {
    console.log('🔄 Creando usuario administrador...');

    // Verificar si ya existe un admin
    const existingAdmin = await User.findOne({ where: { email: 'admin@votacion.com' } });
    
    if (existingAdmin) {
      console.log('✅ El usuario admin ya existe. Verificando rol...');
      
      if (existingAdmin.role === 'admin') {
        console.log('✅ El usuario ya tiene rol de administrador.');
        return;
      } else {
        // Promover a admin
        await existingAdmin.update({ role: 'admin' });
        console.log('✅ Usuario promovido a administrador exitosamente.');
        return;
      }
    }

    // Generar hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('admin123', salt);

    // Crear usuario admin
    const admin = await User.create({
      email: 'admin@votacion.com',
      password_hash,
      full_name: 'Administrador del Sistema',
      role: 'admin',
      is_verified: true
    });

    console.log('✅ Usuario administrador creado exitosamente:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nombre: ${admin.full_name}`);
    console.log(`   Rol: ${admin.role}`);
    console.log('   Contraseña: admin123');

  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error.message);
    process.exit(1);
  }
}

// Ejecutar script
seedAdmin().then(() => {
  console.log('🎉 Script completado exitosamente.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
