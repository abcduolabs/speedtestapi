var speedtest = require('speedtest-net');
var datastore = require('nedb');
var db = new datastore({ filename: '/var/db/speedtest/tests.db', autoload: true });
var memdb = new datastore();

function getLatest(callback) {
  var data = [];
  db.find().sort({ts: -1}).limit(1).exec(function(err, docs) {
    if(err) callback(error);
    for(var i=0; i< docs.length; i++) {
      var d = {
        "result": docs[i],
        "links": { 
          "self": { "href": "/api/speedtest/" + docs[i]._id },
          "reports": { "href": "/api/speedtest/reports" }
        }
      }; 
      data.push(d);
    }
    callback(null, data);
  });
}

function getBestResult(down, callback) {
  var data = [];
  var sortfield = { "download": -1 };
  if (down == false) {
    sortfield = { "upload": -1 };
  }
  db.find().sort(sortfield).limit(1).exec(function(err, docs) {
    if(err) callback(error);
    for(var i=0; i< docs.length; i++) {
      var d = {
        "result": docs[i],
        "links": { 
          "self": { "href": "/api/speedtest/" + docs[i]._id },
          "reports": { "href": "/api/speedtest/reports" }
        }
      }; 
      data.push(d);
    }
    callback(null, data);
  });
}

function getStats(callback) {
  db.find().limit(200).exec(function(err, docs) {
    if(err) callback(error);
    var down = { 'sum': 0, 'max': 0, 'avg': 0 };
    var up = { 'sum': 0, 'max': 0, 'avg': 0 };
    for(var i=0; i< docs.length; i++) {
      down.sum += docs[i].download;
      if (docs[i].download > down.max) down.max = docs[i].download;
      up.sum += docs[i].upload;
      if (docs[i].upload > up.max) up.max = docs[i].upload;
    }
    down.avg = down.sum / docs.length;
    up.avg = up.sum / docs.length;
    
    var data = {
      "stats" : {
        "down": {
          "max": down.max,
          "avg": down.avg
        },
        "up": {
          "max": up.max,
          "avg": up.avg
        },
      },
      "links": { 
        "self": { "href": "/api/speedtest/reports/stats" },
        "reports": { "href": "/api/speedtest/reports" }
      }
    };
    callback(null, data);
  });
}

function getTestByID(id, callback) {
  db.findOne( {_id: id }, function(err, doc) {
    if(err) callback(err);
    var data = {
      "result": doc,
      "links": {
        "self": { "href": "/api/speedtest/" + id },
        "latest": { "href": "/api/speedtest/latest" },
        "reports": { "href": "/api/speedtest/reports" }
      },
    };
    callback(null, data);

  });
}

function getReport(type, callback) {
  var up = [];
  var down = [];
  var data;
  db.find().sort({ts: -1}).limit(200).exec(function(err, docs) {
    if(err) callback(error);
    for(var i=0; i< docs.length; i++) {
      up.push(docs[i].upload);
      down.push(docs[i].download); 
    }
    if (type == 'chart') {
      data = { 'up': up, 'down': down };
    } else {
      callback("Invalid report type requested");
    }
    callback(null, data);
  });
}

function getRunningTestByID(id, callback) {
  memdb.findOne( { _id: id }, function(err, doc) {
    if(err) callback(err);
    var data = {
      "result": doc,
      "links": {
        "self": { "href": "/api/speedtest/running/" + id },
        "latest": { "href": "/api/speedtest/latest" },
      },
    };
    callback(null, data);
  });
}

function execute(callback) {
  var ts = Date.now();
  var test = speedtest({maxTime: 5000});

  // Test completed
  test.on('data', function(data) {
    console.log(ts);
    var doc = {
      ts: ts,
      isp: data.client.isp,
      download: data.speeds.download,
      upload: data.speeds.upload,
      ping: data.server.ping,
      testserver: data.server.host 
    };
    memdb.update({ ts: ts }, doc, {}, function(err, numReplaced) {
      if (err) callback(err);
      console.log("Test completed: ");
      console.log(numReplaced + " docs updated");
      // Save to persistent store
      db.insert(doc, function(err, newDoc) {
        if(err) callback(err);
        console.log("Test saved to persistent store");
      });
    });
  });

  // Test server received
  test.on('testserver', function(server) {
    var doc = {
      ts: ts,
      isp: '',
      download: '',
      upload: '',
      ping: '',
      testserver: server.host
    };
    memdb.update({ ts: ts }, doc, {}, function(err, numReplaced) {
      console.log("Test server acquired");
      console.log(numReplaced + " docs updated");
    });
  });

  // Initiate doc
  var doc = {
    ts: ts,
    isp: '',
    download: '',
    upload: '',
    ping: '',
    testserver: ''
  };
  memdb.insert(doc, function(err, newDoc) {
    if(err) callback(err);
    callback (null, { 
      "id": newDoc._id,
      "message": "Speed test started",
      "links": {
        "self": { "href": "/api/speedtest/running/" + newDoc._id },
        "latest": { "href": "/api/speedtest/latest" },
        "reports": { "href": "/api/speedtest/reports" },
        "bestdown": { "href": "/api/speedtest/best/down" },
        "bestup": { "href": "/api/speedtest/best/up" }
      },
     });    
  });

}

module.exports = {
  getLatest : getLatest,
  getBestResult : getBestResult,
  getStats : getStats,
  getRunningTestByID : getRunningTestByID,
  getTestByID : getTestByID,
  getReport : getReport,
  execute : execute 
}
