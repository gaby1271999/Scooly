var express = require('express');
var fs = require('fs');
var mydocumentsManager = require('./modules/mydocuments_module');
var classManager = require('./modules/class_utils');
var router = express.Router();

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

router.get('/mydocument/:dir?', function(req, res) {
    if (req.session && req.session.user_id) {
        mydocumentsManager.getPath(req.session.user_id, (req.params.dir == undefined ? '' : req.params.dir), function (error, path) {
            if (!error) {
                res.download(path);
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