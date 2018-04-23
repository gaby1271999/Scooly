var express = require('express');

var router = express.Router();

router.get('/', function(req, res) {
    if (req.session && req.session.user_id) {
        delete req.session.user_id;
    }

    res.redirect('/');
});

module.exports = router;