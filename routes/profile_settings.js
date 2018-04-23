var express = require('express');
var database = require('./database');
var profile = require('./utils/profile_utils');
var router = express.Router();

router.post('/password', function(req, res) {
    if (req.session && req.session.user_id) {
        if (req.body.new_password === req.body.repeated_new_password) {
            database.changePassword(req.session.user_id, req.body.old_password, req.body.new_password, function (succes) {
                if (succes) {
                    console.log(succes);
                }
            });
        }
    }

    res.redirect('/myprofile');
});

router.post('/avatar', function(req, res) {
    if (req.session && req.session.user_id) {
        var uploadDirection = __dirname.replace("routes", "private/uploads/" + req.files.file.name);

        req.files.file.mv(uploadDirection, function (error) {
            console.log(error);
        });

        profile.setProfileImage(req.session.user_id, uploadDirection, req.files.file.name, parseInt(req.body.cropx), parseInt(req.body.cropy), parseInt(req.body.cropw), parseInt(req.body.croph));
    }

    res.redirect('/myprofile');
});

module.exports = router;

