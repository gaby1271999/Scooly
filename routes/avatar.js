var express = require('express');
var fs = require('fs');
var database = require('./database');
var router = express.Router();

/* GET home page. */
router.get('/:username', function(req, res) {
    var path = __dirname.replace("routes", "private/images/profiles/");

    if (req.session && req.session.user_id) {
        database.getUserId(req.params.username, function (error, user_id) {
            if (!error) {
                fs.readdir(path.concat(user_id), function (error, files) {
                    if (!error) {
                        res.sendFile(path.concat(user_id) + "/" + files[0]);
                    } else {
                        res.sendFile(path + "/unknown.jpg");
                    }
                });
            } else {
                res.sendFile(path + "/unknown.jpg");
            }
        });
    } else {
        res.sendFile(path + "/unknown.jpg");
    }
});

module.exports = router;