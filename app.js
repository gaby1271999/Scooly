var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var upload = require('express-fileupload');
var session = require('express-session');
var bodyParser = require('body-parser');
var database = require('./routes/database');
var messageModule = require('./routes/modules/message_module');
var classUtils = require('./routes/modules/class_utils');

//TODO remove
var scheduleManager = require('./routes/modules/schedule_manager');

//connect the database
database.connect();
database.defaultDatabase();


//setup schedules
scheduleManager.setupSchedules();


var index = require('./routes/index');
var avatars = require('./routes/avatar');
var login = require('./routes/login');
var logout = require('./routes/logout');
var panel = require('./routes/panel');
var admin = require('./routes/admin');
var adminSettings = require('./routes/admin_settings');
var profile = require('./routes/profile');
var profileSettings = require('./routes/profile_settings');
var json = require('./routes/json');
var download = require('./routes/download');



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(upload());
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({secret: 'Trolking1', resave: false,   saveUninitialized: true, cookie: {secure: false, maxAge: 18000000}}))

app.use(function(request, result, next) {
    //agenda.getDay(new Date(), 0);

    if (request.url.indexOf('nl') > -1) {
        request.language = 'nl';
        request.url = request.url.replace('/nl', '/');
    } else if (request.url.indexOf('fr') > -1) {
        request.language = 'fr';
        request.url = request.url.replace('/fr', '/');
    } else if (request.url.indexOf('en') > -1) {
        request.language = 'en';
        request.url = request.url.replace('/en', '/');
    } else {
        request.language = 'en';
    }

    next();
})

app.use('/', index);
app.use('/avatars', avatars);
app.use('/login', login);
app.use('/logout', logout);
app.use('/panel', panel);
app.use('/admin', admin);
app.use('/admin_settings', adminSettings);
app.use('/myprofile', profile);
app.use('/profile_settings', profileSettings);
app.use('/json', json);
app.use('/download', download);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
