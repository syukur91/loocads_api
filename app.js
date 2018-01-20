// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var firebase = require('firebase');
var _ = require('underscore')
var env = require('node-env-file');
env('.env');
var fb = firebase.initializeApp({ 
    apiKey: process.env.DB_KEY,
    authDomain: process.env.DB_DOMAIN,
    databaseURL: process.env.DB_URL,
    projectId: process.env.DB_PROJECT_ID,
    storageBucket: process.env.DB_BUCKET,
    messagingSenderId: process.env.DB_SENDER_ID
  } );
const dbName = process.env.DB_NAME
var ref = firebase.app().database().ref(dbName);
var usersRef = ref.child('users');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/images', function(req, res) {
    ref.on("value", function(snapshot) {
        console.log(snapshot.val());
        var arr  = [],
        data = snapshot.val()
        var keys = Object.keys(data);
        
        for(var i=0,n=keys.length;i<n;i++){

            var key  = keys[i];
            var newData = data[key]
                newData.id = keys[i]
                newData.localFolderName="loocads"
            delete newData.creatorId
            delete newData.campaignType
            delete newData.latitude
            delete newData.longitude
            delete newData.radius
            arr.push(newData)
            }

        res.json(arr);    
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
        res.json({message: "null"});   
      });
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Loocads API run on port ' + port);