
/* 
-----------GENERAL IMPORTS-----------
*/
var express = require('express'); //express framework!
var logger = require('morgan');
var app = express();  //create the app object
app.use(logger('dev'));
var cookieParser = require('cookie-parser');  //used to 
var session = require('express-session'); //used for managing sessions
var uuid = require('node-uuid');  //used to generate UUIDs
var moment = require('moment'); //clever date library
var fs = require("fs"); //used to interact with the file system

var mongoose = require('mongoose'); //allows interation with MongoDB

//connect to MongoDB!
mongoose.connect('mongodb://localhost/smartfuse');
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

//create instances of the various managers
var userManager = require('./usermanager.js');
var fuseManager = require('./fusemanager.js');
var energyManager = require('./energymanager.js');
var hubManager = require('./hubmanager.js');

//instantiate managers...
userManager.init(mongoose,uuid);
hubManager.init(mongoose,uuid);
fuseManager.init(mongoose,uuid,fs,moment);
energyManager.init();

//create the project name 
var projectName = "Smart Fuse -";

//set up the app!
app.set('view engine', 'jade');

app.use(cookieParser());

//create the session generator
app.use(session({secret: 'J@m3sD3V1n3',
                 saveUninitialized: true,
                 resave: true}));

//create the body parser to automatically pass request parameters
var bodyParser = require('body-parser');
//set the limit to 50mb for image upload
app.use( bodyParser.json({limit: '50mb'}));       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

//set CORS
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};

app.use(allowCrossDomain);

//set the public DIR
app.use(express.static(__dirname + '/public'));


/*
  --------------------INDEX----------------------
*/

app.get('/', function (req, res) {
  console.log("index session ",req.session.userID);
  var callback = function(result){

    //render the api details if the user is logged in!
    res.render('index',{
      header:projectName+' Home',
      user:result,
      userContent:[{
          url:"/api/user/login",
          type:"POST",
          description:"Logs in a user and returns the userid for use with subsequent requests",
          parameters:{
                email:"A string containing the email address of the user.",
                password:"A string containing the password for the user, that was previously defined in the registration view."
          },
          expected:{
            content:'{success: "User logged in!",id: "3a28e870-8bd2-11e4-b4b2-55ea3c35d9e2"}'
          },
          error:{
            content:'{error: "User credentials incorrect"}'
          }
        },
        {
          url:"/api/user/register",
          type:"POST",
          description:"Registers a user with the Smart Fuse Project.",
          parameters:{
                email:"A string containing the email address of the user.",
                password:"A string containing the password for the user, this must match the \"confpassword\" parameter.",
                confpassword:"A string containing the password for the user, this must match the \"password\" parameter.",
                name:"A string containing the password for the user, that was previously defined in the registration view."

          },
          expected:{
            content:'{success: "User logged in!",id: "3a28e870-8bd2-11e4-b4b2-55ea3c35d9e2"}'
          },
          error:{
            content:'{error: "User credentials incorrect"}'
          }
        },
        {
          url:"/api/user/update",
          type:"POST",
          description:"Updates the user object stored in MongoDB",
          parameters:{
                id:"A string containing the id of the user.",
                name:"A string containing the name of the user.",
                email:"A string containing the email address of the user.",
                countryCode:"A string containing the countryCode of the user.",
                houseSize:"A string containing the houseSize of a user, is selected throught the app."
          },
          expected:{
            content:'{success:"User updated!"}'
          },
          error:{
            content:'{error:"User could not be updated"}'
          }
        }],
    fuseContent:[
        {
          url:"/api/fuses",
          type:"GET",
          description:"Gets the fuses based on a supplied user ID",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
          },
          expected:{
            content:'{success: "Fuses retrieved",fuses: [array of fuses]}'
          },
          error:{
            content:'{success: "Fuses retrieved",fuses: [empty array]}'
          }
        },
        {
          url:"/api/fuses/summary",
          type:"GET",
          description:"Gets the users fuse summary for the date given",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
                date:"A string containing the desired date for summary in the format DD-MM-YYYY"
          },
          expected:{
            content:'{success: "Fuse summary retrieved",summary: {summary object}}'
          },
          error:{
            content:'None'
          }
        },
        {
          url:"/api/fuse/add",
          type:"POST",
          description:"Adds a fuse manually to Smart Fuse Project [DEPRECATED in favour of adddata]",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
                fuseID:"The ID of the fuse to add.",
                fuseName:"The symbolic name of the fuse"
          },
          expected:{
            content:'{success: "Fuses retrieved",fuses: []}'
          },
          error:{
            content:'{error: "Fuse already exists"}'
          }
        },
        {
          url:"/api/fuse/upload",
          type:"POST",
          description:"Uploads an image in base 64 format to the server.",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
                fuseID:"The ID of the fuse to upload an icon for.",
                image:"The base 64 string of the image."
          },
          expected:{
            content:'{success: "Fuse data added"}'
          },
          error:{
            content:'{error: "Fuse not found"}'
          }
        },
        {
          url:"/api/fuse",
          type:"GET",
          description:"Gets a singular fuse based on a user ID and a fuse ID",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
          },
          expected:{
            content:'{success: "Fuse retrieved",fuse: [fuse object]}'
          },
          error:{
            content:'{error: "Fuse not found"}'
          }
        },
        {
          url:"/api/fuse/",
          type:"POST",
          description:"If the fuse exists it adds an item to the data array - otherwise it creates it.\nManual creation can be manged by using the /api/fuse/add url\n Also notifys any live data listeners! COOL!",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
                fuseID:"The ID of the fuse to add.",
                fuseVal:"The data to be added"
          },
          expected:{
            content:'{success: "Fuse data added"}'
          },
          error:{
            content:'{error: "Fuse not found"}'
          }
        },
        {
          url:"/api/fuse/",
          type:"PUT",
          description:"Uploads an image in base 64 format to the server.",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
                fuseID:"The ID of the fuse to upload an icon for.",
                fuseName:"The new name of the fuse",
                fuseDescription:"The new description of the fuse",
          },
          expected:{
            content:'{success: "Fuse data added"}'
          },
          error:{
            content:'{error: "Fuse not found"}'
          }
        },
        {
          url:"/api/fuse",
          type:"DELETE",
          description:"Removes a fuse from the Smart Fuse Project",
          parameters:{
                userID:"A string containing the id of the user - retrieved from \"/api/user/login\"",
                fuseID:"The ID of the fuse to remove."
          },
          expected:{
            content:'{success: "Fuse removed"}'
          },
          error:{
            content:'{error: "Fuse couldn\'t be removed"}'
          }
        }
    ]
  });
};

var currentUser = userManager.get(req.session.userID,callback);
  
});

/*
  --------------------FUSES----------------------
*/

app.post('/api/fuse/add', function (req, res) {

  var required = ["userID","fuseID","fuseName"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  logRequest("/api/fuse/add",req.body);
  var callback = function(result){
    if(result===-1){
      res.status(403).json({error:"Fuse already exists"});
    }else{
      res.status(200).json({success:"Fuse added",fuse:result});
    }
  };
  fuseManager.add(req.body.userID,req.body.fuseID,req.body.fuseName,callback);
  
});


app.post('/api/fuse/upload', function (req, res) {

  var required = ["userID","fuseID","image"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/fuse/upload",req.body);

  var fullUrl = req.protocol + '://' + req.get('host');

  var base64Data = req.body.image.replace(/^data:image\/png;base64,/, "");
  var callback = function(result){
    console.log("RESULT ",result);
    if(result!==-1)
      res.status(200).json({success:"Image uploaded"});
    else
      res.status(400).json({error:"Image upload failed"});
  };
  fuseManager.uploadImage(req.body.userID,req.body.fuseID,base64Data,fullUrl,callback);
  
});

app.put('/api/fuse/', function (req, res) {

  var required = ["userID","fuseID","fuseName","fuseDescription"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/fuse",req.body);

  var callback = function(result){
    if(result)
      res.status(200).json({success:"Fuse edited"});
    else
      res.status(403).json({error:"Fuse couldn't be edited"});
  };

  fuseManager.editFuse(req.body.userID,req.body.fuseID,req.body.fuseName,req.body.fuseDescription,callback);
  
});

app.post('/api/fuse/', function (req, res) {
  var required = ["userID","fuseID","fuseVal"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/fuse/adddata",req.body);

  var callback = function(result,data){
    if(result===-1){
      res.status(404).json({error:"Fuse not found"});
    }else{
      io.sockets.in(req.body.userID).emit("dataAdded",{fuseID:req.body.fuseID,value:data});//
      res.status(200).json({success:"Fuse data added"});
    }
  };
  fuseManager.addData(req.body.userID,req.body.fuseID,req.body.fuseVal,callback);
  
});

app.delete('/api/fuse/', function (req, res) {
  var required = ["userID","fuseID"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/fuse",req.body);

  var callback = function(result){
    if(result)
      res.status(200).json({success:"Fuse removed"});
    else
      res.status(403).json({error:"Fuse couldn't be removed"});
  };
  fuseManager.remove(req.body.userID,req.body.fuseID,callback);
  
});

app.get('/api/fuse', function (req, res) {

  var required = ["userID","fuseID"];
  var allParams = checkParams(req.query,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/fuse",req.query);

  var callback = function(result){
    if(result === -1){
      res.status(404).json({error:"Fuse not found"});
    }else{
      res.status(200).json({success:"Fuse retrieved",fuse:result});
    }
  };
  fuseManager.getFuse(req.query.userID,req.query.fuseID,callback);
});

app.get('/api/fuse/summary', function (req, res) {
  var required = ["userID","fuseID"];
  var allParams = checkParams(req.query,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/fuse/summary",req.query);

  var callback = function(result){
    if(result === -1){
      res.status(404).json({error:"Fuse not found"});
    }else{
      res.status(200).json({success:"Fuse summary retrieved",summary:result});
    }
  };
  fuseManager.getSevenDaySummary(req.query.userID,req.query.fuseID,callback);
});

app.get('/api/fuses', function (req, res) {

  var required = ["userID"];
  var allParams = checkParams(req.query,required);
  
  logRequest("/api/fuses",req.query);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  var callback = function(result){
    res.status(200).json({success:"Fuses retrieved",fuses:result});
  };
  fuseManager.getFusesByOwner(req.query.userID,callback);
  
});
app.get('/api/fuses/summary', function (req, res) {
  var required = ["userID","date"];
  var allParams = checkParams(req.query,required);
  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  logRequest("/api/fuses/summary",req.query);
  var callback = function(result){
    res.status(200).json({success:"Fuse summary retrieved",summary:result});
  };
  var callback2 = function(user){
    fuseManager.getSummaryData(user,req.query.userID,req.query.date,callback);
  };
  userManager.get(req.query.userID,callback2);
  
});


app.post('/api/hub', function (req, res) {

  var required = ["hubID","userID"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  
  logRequest("/api/hub",req.body);

  var callback = function(result){
    if(result===-1){
      res.status(400).json({error:"Hub couldn't be added"});
    }else{
      res.status(200).json({success:"Hub added!"});
    }
  };

  hubManager.linkHub(req.body.userID,req.body.hubID,callback);
});

app.delete('/api/hub', function (req, res) {

  var required = ["hubID","userID"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  
  logRequest("/api/hub",req.body);

  var callback = function(result){
    if(result===-1){
      res.status(400).json({error:"Hub couldn't be added"});
    }else{
      res.status(200).json({success:"Hub added!"});
    }
  };

  hubManager.remove(req.body.userID,req.body.hubID,callback);
});

app.get('/api/hub', function (req, res) {


  var required = ["macAddr"];
  var allParams = checkParams(req.query,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  
  logRequest("/api/hub",req.query);

  var callback = function(result){
    if(result===-1){
      res.status(400).json({error:"Hub couldn't be added"});
    }else{
      res.status(200).json({success:"Hub added!"});
    }
  };

  hubManager.retrieve(req.query.macAddr,callback);
});

app.get('/api/hubs', function (req, res) {


  var required = ["userID"];
  var allParams = checkParams(req.query,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  
  logRequest("/api/hubs",req.query);

  var callback = function(result,hubs){
    if(result===-1){
      res.status(400).json({error:"Hubs couldn't be retrieved"});
    }else{
      res.status(200).json({success:"Hubs retrieved",hubs:hubs});
    }
  };

  getHubs.add(req.query.userID,callback);
});

/*
  --------------------LOGIN----------------------
*/

app.get('/login', function (req, res) {
  res.render('login',{header:projectName+' Login'});
});

app.post('/api/user/login', function (req, res) {

  console.log(req.body);

  var required = ["email","password"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  
  logRequest("/api/user/login",req.body);

  var callback = function(result){
    if(result===-1){
      res.status(403).json({error:"User credentials incorrect"});
    }else{
      result=result.toObject();
      req.session.userID = result.id;
      result.energy = energyManager.getEnergyStats(result.countryCode);
      res.status(200).json({success:"User logged in!",user:result});
    }
  };

  userManager.login(req.body.email,req.body.password,callback);
});



app.put('/api/user/', function (req, res) {

  var required = ["id","name","email","countryCode","houseSize"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }
  
  logRequest("/api/user/",req.body);

  var callback = function(result){
    if(result===-1){
      res.status(403).json({error:"User could not be updated"});
    }else{
      res.status(200).json({success:"User updated!"});
    }
  };

  userManager.update(req.body.id,req.body.name,req.body.email,req.body.countryCode,req.body.houseSize,callback);
});

app.delete('/api/user/', function (req, res) {
  var required = ["userID","fuseID"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/user",req.body);

  var callback = function(result){
    if(result)
      res.status(200).json({success:"User removed"});
    else
      res.status(403).json({error:"User couldn't be removed"});
  };
  fuseManager.remove(req.body.userID,req.body.fuseID,callback);
  
});

/*
  --------------------REGISTER----------------------
*/

app.get('/register', function (req, res) {
  res.render('register',{header:projectName+' Register'});
});

app.post('/api/user/register', function (req, res) {
  var required = ["email","password","name"];
  var allParams = checkParams(req.body,required);

  if(!allParams){
    res.status(400).json({error:"Missing a parameter"});
    return;
  }

  logRequest("/api/user/register",req.body);

  var callback = function(result,user){
    if(result===-1){
      res.status(400).json({error:"User already registered!"});
    }else{
      req.session.userID = user.id;
      res.status(200).json({success:"User registered!",user:user});
    }
  };

  userManager.add(req.body.email,req.body.name,req.body.password,callback);
});

/*
  --------------------LOGOUT----------------------
*/

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.redirect('/');
});

/*
  --------------------SERVER OBJECT----------------------
*/

var server = app.listen(8000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Server listening at http://%s:%s', host, port);
});

var io = require('socket.io')(server);

io.on('connection', function(socket){

  //http://stackoverflow.com/questions/4647348/send-message-to-specific-client-with-socket-io-and-node-js
  console.info('New client connected (id=' + socket.id + ').');

  socket.on('setUserID',function(userData){
    socket.join(userData.userid);
    console.log(userData);
  });
});

function logRequest(location,body){
  var logString = "";

  for(var key in body)
    logString+=" || "+key+": "+body[key];
  
  console.log(location+":"+logString);
}

//returns true if all params are there
function checkParams(request,required){
  for(var i =0;i<required.length;i++){
    if(typeof request[required[i]] === 'undefined')
      return false;
  }
  return true;
}

