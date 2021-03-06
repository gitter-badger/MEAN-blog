var express = require('express');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var routes = require('./routes/index');
//var users = require('./routes/users');
var flash = require('connect-flash');
var Config = require('./config');
var config = new Config();

var app = express();

if(config.logger()===1){
  var fs = require('fs');
  var accessLog = fs.createWriteStream('access.log', {flags: 'a'});
  var errorLog = fs.createWriteStream('error.log', {flags: 'a'});

  app.use(logger({stream: accessLog}));
  app.use(function (err, req, res, next) {
    var meta = '[' + new Date() + '] ' + req.url + '\n';
    errorLog.write(meta + err.stack + '\n');
    next();
  });
}


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(flash());
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: config.dbSecret(),
  key: config.dbCookieKey(),//cookie name
  cookie: {maxAge: 1000 * 60 * 60 * 24 * config.dbCookieDays()},//30 days
  resave: true,
  saveUninitialized:true,
  store: new MongoStore({
    url: config.dbURI() // *updated
  })
}));

app.use(function(req, res, next){
    res.locals.session = req.session;
    next();
});


app.use('/', routes);
//app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
