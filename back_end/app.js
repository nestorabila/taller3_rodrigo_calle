
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config()

const allowedOrigins = [
  'https://creacioneslucianitav7.onrender.com',
  'http://localhost:4200',
  'http://localhost:5173',
  'http://192.168.0.64:4300',
  'capacitor://localhost',
  'https://localhost',
  'https://sincerity-shortly-sprout.ngrok-free.dev'
];

app.use(cors({
  origin: function(origin, callback) {
    
    if (!origin) {
   
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
   
      return callback(null, true);
    } else {
      console.warn(`❌ Origen NO permitido: ${origin}`);
      return callback(new Error('CORS Error: Origen no permitido - ' + origin), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}))

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'");
    next();
});

//cualquier api que hagas al servidor siempre va pasar pruimero por este archivo app.js de aqui se rediriguen a las rutas
app.get('/', (req, res) => {
    res.send('API funcionando correctamente');
});
// Middleware para analizar JSON
app.use(express.json());//para que sis se envia json del cliente el servidor lo entienda
app.use(express.urlencoded({ extended: true}))
// app - rutas(aproabdo por token) - recienpasa a controladores
const personaRoute = require('./src/rutas/personaRutas')
app.use('/api',personaRoute)

const excelRoute = require('./src/rutas/excelRutas')
app.use('/api',excelRoute)

const analisisRoute = require('./src/rutas/analisisRuta')
app.use('/api',analisisRoute)

const ciudadRoute = require('./src/rutas/ciudadRutas')
app.use('/api',ciudadRoute)

const archivoRuta = require("./src/rutas/archivoRuta");
app.use("/api", archivoRuta);

const permisoRoute = require('./src/rutas/permisoRutas')
app.use('/api',permisoRoute)

const tipoRoute = require('./src/rutas/tipoRutas')
app.use('/api',tipoRoute)

const casoRoute = require('./src/rutas/casoRutas')
app.use('/api',casoRoute)

const rolRoute = require('./src/rutas/rolRutas')
app.use('/api',rolRoute)

const IaUsuarioRoute = require('./src/rutas/usuarioIARuta')
app.use('/api',IaUsuarioRoute)


const credencialRoute = require('./src/rutas/credencialRutas')
app.use('/api',credencialRoute)



const LoginRoute = require('./src/rutas/IniciarSesionRutas')
app.use('/api',LoginRoute)

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
