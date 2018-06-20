var express = require('express');
var fs = require('fs');
var path = require('path');
var database = require('./database');
var router = express.Router();
var mainFolder = require(__dirname + '/utils/main_folder');


/* GET home page. */
router.get('/:username', function(req, res) {
    var dir = path.join(mainFolder.mainFolder(), "/private/images/profiles/");

    if (req.session && req.session.user_id) {
        database.getUserId(req.params.username, function (error, user_id) {
            if (!error) {
                fs.readdir(dir.concat(user_id), function (error, files) {
                    if (!error) {
                        res.sendFile(dir.concat(user_id) + "/" + files[0]);
                    } else {
                        res.sendFile(dir + "/unknown.jpg");
                    }
                });
            } else {
                res.sendFile(dir + "/unknown.jpg");
            }
        });
    } else {
        res.sendFile(dir + "/unknown.jpg");
    }
});

module.exports = router;