require('dotenv').config();

const HEADER_KEY = 'x-admin-api-key';

const adminGuard = (req, res, next) => {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey || configuredKey === 'CAMBIA_ESTE_TOKEN_SEGURO') {
    return res.status(500).json({
      message: 'ADMIN_API_KEY no está configurada en el servidor. Define un valor seguro en .env.',
    });
  }

  const providedKey = req.headers[HEADER_KEY];
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({ message: 'No autorizado para ejecutar operaciones administrativas.' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Se requiere autenticación JWT para operaciones administrativas.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Tu cuenta no tiene privilegios de administrador.' });
  }

  next();
};

module.exports = { adminGuard };
