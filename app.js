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
var moment = require('moment');
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
const deviceDbName = process.env.DEVICES_DB_NAME
var ref = firebase.app().database().ref(dbName);
var ref2 = firebase.app().database().ref(playlistDbName);
var ref3 = firebase.app().database().ref(deviceDbName);
var usersRef = ref.child('playlist2');
var appPort = process.env.APP_PORT
var localFolderName =  process.env.LOCAL_FOLDER_NAME

var nameDB = require('./fire.js');

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
router.post('/devices', function(req, res) {
var devices = []
var finalResult = {}
    async.series({
        devices:  function(cb) {
         
            ref3.on("value", function(snapshot) {
                console.log(snapshot.val());
                var requestBody = req.body;
                var arr  = [],
                data = snapshot.val()
                if(data){
                    var keys = Object.keys(data);       
                    for(var i=0,n=keys.length;i<n;i++){
                        var key  = keys[i];
                        var newData = data[key]
                        devices.push(newData)
                    }
                    cb(null, devices); 
                }else{
                    cb(null, null); 
                }
                
              }); 
              
          },
          finalResult:  function(cb) {
            var device = {deviceId:req.body.deviceId,created:moment().format()}
            ref3.push(device); 
              // do some more stuff ...
            cb(null, finalResult);
          }
      },
      // optional callback
      function(err, results) {
          res.json(results); 
      });   
      
});
router.post('/deduction', function(req, res) {

    var temp = {};
    var deduction = 0;

      async.series({
        campaignData:  function(cb) {  
            //Find the difference between firebase playlist and device playlist        
            firebase.app().database().ref(dbName+'/' + req.body.id).once('value').then(function(snapshot) {
                temp.campaignData = snapshot.val();
                cb(null, temp);
            })
            
          },
        finalResult:  function(cb) {    
            deduction = temp.campaignData.quantity - req.body.quantity
            firebase.app().database().ref(dbName+'/' + req.body.id).update({
                quantity:  deduction
              }, function(error) {
                if (error) {
                  // The write failed...
                    cb(error, null); 
                } else {
                  // Data saved successfully!
                    cb(null, temp);
                }
              });
        }
      },
      // optional callback
      function(err, results) {
          if(err){
            res.json(err);   
          }
          temp.campaignData.quantity = deduction
          res.json(temp); 
      });
});
// more routes for our API will happen here

router.post('/deductions', function(req, res) {

    var temp = {};
    var deduction = 0;
    var campaigns = []
    var requests =[]
    var updatedUserData = {};
    
    async.waterfall([
        function (callback) {
            console.log('First Step --> ');
            ref.on("value", function(snapshot) {
                // console.log(snapshot.val());
                var arr  = [],
                data = snapshot.val()
                var keys = Object.keys(data);       
                for(var i=0,n=keys.length;i<n;i++){
        
                    var key  = keys[i];
                    var newData = data[key]
                        newData.id = keys[i]

                        newData.quantity = parseInt(newData.quantity)

                        delete newData.creatorId
                        delete newData.campaignType
                        delete newData.latitude
                        delete newData.longitude
                        delete newData.radius
                        delete newData.imageUrl
                   
                    campaigns.push(newData)
                    }
                    callback(null, '1', '2');
                    
              }, function (errorObject) {
                console.log("The read failed: " + errorObject.code);
                callback(errorObject, null);   
              });
            
        },
        function (arg1, arg2, callback) {
            console.log('Second Step --> ' + arg1 + ' ' + arg2);
            _.each(req.body.data, function(data) {
                var id = data.id;
                var dataQt = _.findWhere(campaigns, {id: data.id}).quantity;
                var requestQt = data.quantity;
                
                var resultQt = parseInt(dataQt) - parseInt(requestQt)
                console.log("id: "+id +"result: "+ resultQt)
                // updatedUserData["-KxD3_4L_Fqzuk1Su-lP/quantity"]=1;
                updatedUserData[id+"/quantity"]=resultQt;
                
            }); 
            callback(null, updatedUserData);
        },
        function (arg1, callback) {
            console.log(updatedUserData)
            firebase.app().database().ref("loocads").update(updatedUserData, function(error) {
                if (error) {
                  // The write failed...
                  callback(error, null);
                } else {
                  // Data saved successfully!
                  callback(null, 'final result');
                }
              }); 
            
        }
    ], function (err, result) {
        console.log('Main Callback --> ' + result);
        res.json(results); 
    });


    

    //   async.series({
    //     campaignData:  function(cb) {  

    //          ref.on("value", function(snapshot) {
    //             // console.log(snapshot.val());
    //             var arr  = [],
    //             data = snapshot.val()
    //             var keys = Object.keys(data);       
    //             for(var i=0,n=keys.length;i<n;i++){
        
    //                 var key  = keys[i];
    //                 var newData = data[key]
    //                     newData.id = keys[i]

    //                     newData.quantity = parseInt(newData.quantity)

    //                     delete newData.creatorId
    //                     delete newData.campaignType
    //                     delete newData.latitude
    //                     delete newData.longitude
    //                     delete newData.radius
    //                     delete newData.imageUrl
                   
    //                 campaigns.push(newData)
    //                 }
        
                    
    //                 cb(null, campaigns); 
    //           }, function (errorObject) {
    //             console.log("The read failed: " + errorObject.code);
    //             cb(errorObject, null);   
    //           });
             
               
    //       },
    //       calculated:  function(cb) {    


    //         _.each(req.body.data, function(data) {
    //             var id = data.id;
    //             var dataQt = _.findWhere(campaigns, {id: data.id}).quantity;
    //             var requestQt = data.quantity;
                
    //             var resultQt = parseInt(dataQt) - parseInt(requestQt)
    //             console.log("id: "+id +"result: "+ resultQt)
    //             // updatedUserData["-KxD3_4L_Fqzuk1Su-lP/quantity"]=1;
    //             updatedUserData[id+"/quantity"]=resultQt;
                
    //         });

    //         cb(null, updatedUserData);  
           
    //     },
    //     finalResult:  function(cb) {    

    //         console.log(updatedUserData)
    //         firebase.app().database().ref("loocads").update(updatedUserData, function(error) {
    //             if (error) {
    //               // The write failed...
    //                 cb(error, null);  
    //             } else {
    //               // Data saved successfully!
    //                 cb(null, temp);  
    //             }
    //           }); 
    //     }
    //   },
    //   // optional callback
    //   function(err, results) {
    //       if(err){
    //         res.json(err);   
    //       }


    //       res.json(results); 
        

    //   });

   

    
});


router.get('/list', function(req, res) {
        
    list = {}

    
    var pPage = req.query.per_page;
    var cPage = req.query.page;

    perPage = parseInt(pPage)
    currentPage = parseInt(cPage)
    
    list.total= 200
    list.per_page= 15
    list.current_page= currentPage
    list.last_page = 14
    list.next_page_url= "http://localhost:4443/list?page="+currentPage
    list.prev_page_url= (currentPage == 1 ? null : "http://localhost:4443/list?page="+(currentPage-1));
    list.from = 1
    list.to= 15
    list.data = []

    var startNumber = 0

    currentPage > 1 ? (startNumber = ((perPage*currentPage) - perPage)+1) : (startNumber = 1);

    for(var i=0,n=perPage;i<n;i++){
  
          item = {}

          item.id = (i+startNumber)
          item.name= "Noelia O'Kon"+(i+startNumber)
          item.nickname= "asperiores"
          item.email= "otho.smitham@example.com"
          item.birthdate= "1978-06-28 00:00:00"
          item.gender= "F"
          item.salary= "13098.00"
          item.group_id= 2
          item.created_at= "2017-01-01 07:21:10"
          item.updated_at= "2017-01-01 07:21:10"

          list.data.push(item)
  
      }


    res.json(list);
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Loocads API run on port ' + port);