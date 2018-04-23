var express = require('express');
var database = require('./database');

var router = express.Router();

/* Post request. */
router.post('/', function(req, res) {
    database.login(req.body.username, req.body.password, function (result, id) {
        if (result == true) {
            req.session.user_id = id;

            res.redirect('/panel');
        } else {
            backToLoginPage(res);
        }
    });
});

function backToLoginPage(res) {
    var encodedString = encodeURIComponent('Password or username is wrong!');
    res.redirect('/?error=' + encodedString);
}

module.exports = router;