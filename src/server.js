const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all network interfaces

// Function to get server IP address
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development, enable in production
}));

// CORS for API
app.use('/api', cors());

// Logging
app.use(morgan('dev'));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: './database'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make helper functions available to all views
const moment = require('moment-timezone');
// Set default timezone to Asia/Jakarta (WIB, UTC+7)
moment.tz.setDefault('Asia/Jakarta');
app.locals.moment = moment;
const helpers = require('./utils/helpers');
app.locals.helpers = helpers;

// Middleware to inject timezone into all views
const db = require('./database/db');
app.use(async (req, res, next) => {
  try {
    // Get timezone from settings
    const timezoneSetting = await db.get("SELECT value FROM settings WHERE key = 'timezone'");
    res.locals.timezone = timezoneSetting?.value || 'Asia/Jakarta';
  } catch (error) {
    // Fallback to default if DB error
    res.locals.timezone = 'Asia/Jakarta';
  }
  next();
});

// Subdomain detection middleware
app.use((req, res, next) => {
  const hostname = req.hostname;

  // Detect customer subdomain
  // Matches: customer.*, portal.*, my.*
  if (hostname.match(/^(customer|portal|my)\./i) || hostname === 'customer.localhost' || hostname === 'portal.localhost' || hostname === 'my.localhost') {
    req.isCustomerPortal = true;
    req.isAdminPortal = false;
  }
  // Detect admin subdomain
  // Matches: admin.*, app.*
  else if (hostname.match(/^(admin|app)\./i) || hostname === 'admin.localhost' || hostname === 'app.localhost') {
    req.isAdminPortal = true;
    req.isCustomerPortal = false;
  }
  // Fallback to admin for bare domains
  else {
    req.isAdminPortal = true;
    req.isCustomerPortal = false;
  }

  next();
});

// Routes
const customerPortalRoutes = require('./routes/customerPortalRoutes');
const routes = require('./routes');

// Dynamic routing based on subdomain
app.use((req, res, next) => {
  if (req.isCustomerPortal) {
    // On customer subdomain, mount customer routes on root
    customerPortalRoutes(req, res, next);
  } else {
    // On admin subdomain or bare domain
    // Still support /customer path for backward compatibility
    if (req.path.startsWith('/customer')) {
      customerPortalRoutes(req, res, next);
    } else {
      routes(req, res, next);
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('errors/404', { user: req.session });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('errors/500', {
    user: req.session,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const serverIP = getServerIP();

app.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   SaaS Licensing System                              ║
║   Server running on port ${PORT}                        ║
║                                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                       ║
║   Local:   http://localhost:${PORT}                     ║
║   Network: http://${serverIP}:${PORT}                   ║
║                                                       ║
║   Admin Login:                                        ║
║   Email: ${process.env.ADMIN_EMAIL || 'admin@example.com'}                    ║
║   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}                                 ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
