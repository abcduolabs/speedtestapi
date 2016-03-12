var speedtest = require('speedtest-net');
var datastore = require('nedb');
var db = new datastore({ filename: '/var/db/speedtest/tests.db', autoload: true });
var memdb = new datastore();

function getLatest(callback) {
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
      },
     });    
  });

}

module.exports = {
  getLatest : getLatest,
  getRunningTestByID : getRunningTestByID,
  execute : execute 
}
