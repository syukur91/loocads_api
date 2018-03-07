// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var firebase = require('firebase');
var async = require('async');
var geolib = require('geolib');
var _ = require('underscore')
var env = require('node-env-file');
var split = require('split-object')
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
const playlistDbName = process.env.PLAYLIST_DB_NAME
var ref = firebase.app().database().ref(dbName);
var ref2 = firebase.app().database().ref(playlistDbName);
var usersRef = ref.child('playlist2');
var appPort = process.env.APP_PORT
var localFolderName =  process.env.LOCAL_FOLDER_NAME

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.APP_PORT || 8080;        // set our port

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
                newData.localFolderName=localFolderName
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

router.post('/playlist', function(req, res) {
    ref.on("value", function(snapshot) {
        console.log(snapshot.val());
        var arr  = [],
        data = snapshot.val()
        var keys = Object.keys(data);

        var latitude = parseFloat(req.body.latitude)
        var longitude = parseFloat(req.body.longitude)
        var newData = []
        var playlist = []
        
       

            async.series({
              arr:  function(cb) {
                    for(var i=0,n=keys.length;i<n;i++){

                        var key  = keys[i];
                            newData = data[key]
                            newData.id = keys[i]
                            newData.localFolderName="loocads"
                        delete newData.creatorId
                        delete newData.campaignType
                        
                        arr.push(newData)
                    }


                    cb(null, arr);
                },
              playlist:  function(cb) {

                    _.each(arr, function(post) {

                        var radiusTest=parseInt(post.radius)*1000
    
                        var data = geolib.isPointInCircle(
                            {latitude: latitude, longitude: longitude},
                            {latitude: post.latitude, longitude: post.longitude},                        
                            radiusTest
                        );
                        if(data){
                            playlist.push(post)
                        }  
                        });

                    // do some more stuff ...
                    cb(null, playlist);
                }
            },
            // optional callback
            function(err, results) {
                res.json(results.playlist); 
            });

           
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
        res.json({message: "null"});   
      });
});

router.post('/playlists', function(req, res) {
    var campaigns = []
    var playlist = []
    var devicePlaylist = {}
    var filteredImagelist = [];
    var finalResult = {};
    var newList = []
    var finalList = []
      async.series({
        campaigns:  function(cb) {
            //Get campaign list from firebase collection
            ref.on("value", function(snapshot) {
                console.log(snapshot.val());
                var data = snapshot.val()
                var keys = Object.keys(data);
                
                for(var i=0,n=keys.length;i<n;i++){
        
                    var key  = keys[i];
                    var newData = data[key]
                        newData.id = keys[i]
                        newData.localFolderName=localFolderName
                    delete newData.creatorId
                    delete newData.campaignType
                    delete newData.latitude
                    delete newData.longitude
                    delete newData.radius
                    campaigns.push(newData)
                    }
                    cb(null, campaigns);
              }, function (errorObject) {
                console.log("The read failed: " + errorObject.code);
                cb(errorObject, null);   
              });
         
              
          },
        playlist:  function(cb) {
            //Get created playlist from firebase collection
            ref2.on("value", function(snapshot) {
                console.log(snapshot.val());
                var requestBody = req.body;
                var arr  = [],
                data = snapshot.val()           
        
                var arr = Object.keys(data.playlist2).map(function(k) { return data.playlist2[k] });
        
                 for(var i=0,n=arr.length;i<n;i++){
                    var obj  = arr[i];
                    var newAds = split(arr[i].ads).map(function(adsData) {return adsData})
                    arr[i].ads = newAds;
                }
                //TODO: Map with active image from server
                playlist = arr
                cb(null, playlist); 
              }, function (errorObject) {
                console.log("The read failed: " + errorObject.code);
                cb(errorObject, null); 
              });        
              // do some more stuff ...
              
          },
        devicePlaylist:  function(cb) {
            //Query the playlist by deviceId
            devicePlaylist = _.findWhere(playlist, {deviceId: req.body.deviceId});
            _.each(devicePlaylist.ads, function(item){
                newList.push(item.value)
            });
            cb(null, devicePlaylist);
          },
        filteredImagelist:  function(cb) {  
            //Find the difference between firebase playlist and device playlist        
            filteredImagelist = _.difference(newList, req.body.imageList);
            cb(null, filteredImagelist);
          },
        finalResult:  function(cb) {    
            //Compose the final result    
            _.each(filteredImagelist, function(item){
                var obj = _.findWhere(campaigns, {id: item});
                finalList.push(obj)
            });
            finalResult.list = filteredImagelist
            finalResult.result = finalList
            cb(null, finalResult);
          }
      },
      // optional callback
      function(err, results) {
          res.json(results.finalResult); 
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