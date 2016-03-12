var restify = require('restify');
var speedtester = require('./speedtester.js');

var port = 4242;
var server = restify.createServer({
  name : "speedtestapi"
});

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());

function latestTest(req, res, next) {
  console.log("Serving request to get result from latest speed test");
  speedtester.getLatest(function(error, data) {
    if(error) {
      return next(new restify.errors.InternalServerError("Failed to get result from latest test"));
    }
    res.send(data);
  });
  return next();
}

function bestTestDown(req, res, next) {
  console.log("Serving request to get result from best speed test");
  var down = true;
  speedtester.getBestResult(down, function(error, data) {
    if(error) {
      return next(new restify.errors.InternalServerError("Failed to get result from best test"));
    }
    res.send(data);
  });
  return next();
}

function runTest(req, res, next) {
  console.log("Serving request to run speed test");
  speedtester.execute(function(error, data) {
    if(error) {
      return next(new restify.errors.InternalServerError("Failed to execute speed test"));
    }
    res.send(data);
  });
  return next();
}

function getStatus(req, res, next) {
  var id = req.params.id;
  console.log("Serving request to get status for ID: " + id);
  speedtester.getRunningTestByID(id, function(error, data) {
    if(error) {
      // Should return 404?
      return next(new restify.errors.InternalServerError("Failed to get status"));
    }
    res.send(data);
  });
}

function getTest(req, res, next) {
  var id = req.params.id;
  console.log("Serving request to get test results for ID: " + id);
  speedtester.getTestByID(id, function(error, data) {
    if(error) {
      // Should return 404?
      return next(new restify.errors.InternalServerError("Failed to get test"));
    }
    res.send(data);
  });
}

function reportChart(req, res, next) {
  console.log("Serving request to get report chart");
  speedtester.getReport('chart', function(error, data) {
    if(error) {
      // Should return 404?
      return next(new restify.errors.InternalServerError("Failed to get report"));
    }
    res.send(data);
  });
}

server.get({ path: '/api/speedtest/latest' }, latestTest);
server.get({ path: '/api/speedtest/best/down' }, bestTestDown);
server.get({ path: '/api/speedtest/reports/chart' }, reportChart);
server.get({ path: '/api/speedtest/:id' }, getTest);
server.get({ path: '/api/speedtest/running/:id' }, getStatus); 
server.post({ path: '/api/speedtest' }, runTest);

server.listen(port, function() {
  console.log('Speed test API is listening at %s', server.url);
});

