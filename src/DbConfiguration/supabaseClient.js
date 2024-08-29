const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.wtzaxklwfvlpqtzsmefw',
  host: 'aws-0-us-west-1.pooler.supabase.com',
  database: 'postgres',
  password: 'CARLITOSIi209090/#',
  port: 6543,
});

// Función para conectar con timeout
const connectWithTimeout = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()'); // Ejecutar una consulta simple para verificar la conexión
    console.log('Conexión a la base de datos establecida correctamente.');
    client.release();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
  }
};

// Llamar a la función de conexión al iniciar la aplicación
connectWithTimeout();

module.exports = pool;
