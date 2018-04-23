var express = require('express');
var fs = require('fs');
var classManager = require('./modules/class_utils');
var router = express.Router();

/* GET home page. */
router.get('/:subject&:filePath', function(req, res) {
    if (req.session && req.session.user_id) {
        classManager.getDocumentPath(req.session.user_id, req.params.subject, decodeURIComponent(req.params.filePath), function (error, dir) {
            if (!error) {
                res.download(dir);
            } else {
                var err = new Error('Not Found');
                res.status(err.status || 500);
                res.render('error');
            }
        });
    } else {
        var err = new Error('Not Found');
        res.status(err.status || 500);
        res.render('error');
    }
});

module.exports = router;