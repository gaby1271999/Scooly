var express = require('express');
var router = express.Router();
var database = require('./database');
var lm = require('./modules/language_module');

router.get('/', function(req, res) {
    if (req.session && req.session.user_id) {
        lm.getFile(req, function (dir) {
            database.getUsername(req.session.user_id, function (username) {
                res.render('myprofile', {
                    username: username,
                    object: lm.createObject(dir)
                });
            });
        });
    } else {
        lm.getFile(req, function (dir) {
            res.render('index', {error: "First login!", object: lm.createObject(dir)});
        });
    }
});

module.exports = router;