var express = require('express');
var lm = require('./modules/language_module');
var router = express.Router();

/* GET home page. */
router.get('', function(req, res) {
    if (req.session && req.session.user_id) {
        res.redirect('/panel');
    } else {
        lm.getFile(req, function (dir) {
            res.render('index', {error: (req.query.error ? decodeURIComponent(req.query.error) : ''), object: lm.createObject(dir)});
        });
    }
});

module.exports = router;
