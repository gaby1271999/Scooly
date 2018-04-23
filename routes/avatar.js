var express = require('express');
var fs = require('fs');
var router = express.Router();

/* GET home page. */
router.get('/:id', function(req, res) {
    var path = __dirname.replace("routes", "private/images/profiles/");

    if (req.session && req.session.user_id) {
        fs.readdir(path.concat(req.params.id), function (error, files) {
            if (!error) {
                res.sendFile(path.concat(req.params.id) + "/" + files[0]);
            } else {
                res.sendFile(path + "/unknown.jpg");
            }
        });
    } else {
        res.sendFile(path + "/unknown.jpg");
    }
});

module.exports = router;