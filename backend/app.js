/**
 * cPanel Phusion Passenger Startup File
 * Directs traffic to src/server.js and starts HTTP listener for Passenger
 */
const app = require('./src/server.js');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`AaharIN Cloud Sync API started on port ${PORT}`);
});
