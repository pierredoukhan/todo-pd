/*eslint-env express, node*/
// turn off warnings for semicolons
/*eslint semi:0*/

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var cfenv   = require('cfenv');
var favicon = require('serve-favicon');
var app     = express();
var bodyParser = require('body-parser')

// Set up environment variables
var port = process.env.PORT || 8080;

// cfenv provides access to your Cloud Foundry environment
var vcapLocal = null
try {
  // load local VCAP configuration
  vcapLocal = require("./vcap-local.json");
  console.log("APP - Loaded local VCAP", vcapLocal);
} catch (e) {
  console.error(e);
}

// This option property is ignored if not running locally.
var options = vcapLocal ? { vcap: vcapLocal } : {}
var appEnv = cfenv.getAppEnv(options);

console.log('APP - Running Local: ' + appEnv.isLocal);
console.log('APP - App Name: ' + appEnv.name);

// Configure Cloudant database service
// Return all services, in an object keyed by service name.
var services = appEnv.getServices();
var cloudantCreds;
var count = 0;
for (var serviceName in services) {
  if (services.hasOwnProperty(serviceName)) {
    count++;
    var service = services[serviceName];
    console.log('APP - Svc Name=' + service.name + ', Label=' + service.label);
    if (service.label == "cloudantNoSQLDB") {
      cloudantCreds =  service.credentials;
    }
  }
}
if (!count) {
  console.log('APP - No services are bound to this app.\n');
}

// To be used when the string is the exact name of the service
//var cloudantCreds = getServiceCreds(appEnv, 'Cloudant NoSQL DB-px');
// To be used when the service name matches the regular expression
//var cloudantCreds =  appEnv.getServiceCreds(/cloudant/i));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json()); // parse application/json

require("./app/database.js")(appEnv, cloudantCreds, "todos",
  function (err, database) {
    if (err) {
      console.log(err);
    } else {
      // database is initialized, install our CRUD route for Todo objects
      require('./app/todos.js')(app, database);
    }
});

// set the static files location /public/img will be /img for users
app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/icons/favicon.ico'));

// start server on the specified port and binding host
//Not supported on DIEGO
app.listen(appEnv.port, "0.0.0.0", function () {
//app.listen(port, function () {
  console.log("APP - Server starting on " + port);
});

// Retrieves service credentials by service name
function getServiceCreds(appEnv, serviceName) {
    var serviceCreds = appEnv.getServiceCreds(serviceName);
    if (!serviceCreds) {
        console.log("service " + serviceName + " not bound to this application");
        return null;
    }
    return serviceCreds;
}
