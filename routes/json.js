var express = require('express');

var news = require('./modules/news_module');
var messageManager = require('./modules/message_module');
var agendaManager = require('./modules/agenda_module');
var classUtils = require('./modules/class_utils');
var database = require('./database');
var permissionManager = require('./permission');

var router = express.Router();

router.get('/login/:username&:password', function(req, res) {
    if (req.session && req.session.user_id) {
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify({loggedIn: true}));
    } else {
        database.login(req.params.username, req.params.password, function (result, id) {
            if (result == true) {
                req.session.user_id = id;
            }

            res.setHeader('Content-type', 'application/json');
            res.send(JSON.stringify({loggedIn: result}));
        });
    }
});

router.get('/news/:from&:to', function(req, res) {
    if (req.session && req.session.user_id) {
        news.getNews(req.params.from, req.params.to, function (news) {
            res.setHeader('Content-type', 'application/json');
            res.send(JSON.stringify(news));
        });
    } else {
        res.status(err.status || 500);
        res.render('error');
    }
});

router.get('/haspermission/:permission', function (req, res) {
    if (req.session && req.session.user_id) {
        var permission = req.params.permission;

        database.getGroup(req.session.user_id, function (groupName) {
            permissionManager.hasPermission(groupName, permission, function (result) {
                res.setHeader('Content-type', 'application/json');
                res.send(JSON.stringify({hasPermission: result}));
            });
        });
    } else {
        res.status(err.status || 500);
        res.render('error');
    }
});

router.get('/getmails/:from&:to', function (req, res) {
    if (req.session && req.session.user_id) {
        /*database.getMailAdress(req.session.user_id, function (address) {
            console.log(address)
            messageManager.getMailsObject(req.session.user_id, address, req.params.from, req.params.to, function (mails) {
                res.setHeader('Content-type', 'application/json');
                res.send(JSON.stringify(mails));
            });
        });*/

        res.setHeader('Content-type', 'application/json');
        res.send([]);
    } else {
        res.status(err.status || 500);
        res.render('error');
    }
});

router.get('/getmonth/:year&:month', function (req, res) {
    if (req.session && req.session.user_id) {
        var date = new Date(req.params.year, req.params.month);

        database.getGroup(req.session.user_id, function (groupName) {
            agendaManager.getMonth(date, req.session.user_id, groupName, function (itemList) {
                res.setHeader('Content-type', 'application/json');
                res.send(JSON.stringify(itemList));
            });
        });
    } else {
        res.status(err.status || 500);
        res.render('error');
    }
});

router.get('/getgroups/:word', function (req, res) {
    if (req.session && req.session.user_id) {
        var groupList = permissionManager.getAllGroups(permissionManager.groups);
        var word = req.params.word;

        groupList.sort(function (a, b) {
            var aCount = 0;
            var bCount = 0;
            for (var index in word) {
                for (var aIndex in a) {
                    if (a[aIndex] == word[index]) {
                        aCount++;
                        break;
                    }
                }

                for (var bIndex in b) {
                    if (b[bIndex] == word[index]) {
                        bCount++;
                        break;
                    }
                }
            }

            if (aCount > bCount) {
                return -1;
            } else if (aCount < bCount) {
                return 1;
            } else {
                return 0;
            }
        });

        var newGroupList = groupList.slice(0, 5);

        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(newGroupList));
    } else {
        res.status(err.status || 500);
        res.render('error');
    }
});

router.get('/subjects', function (req, res) {
   if (req.session && req.session.user_id) {
       database.getUserClassName(req.session.user_id, function (error, className) {
           classUtils.getSubjects(req.session.user_id, className, function (subjects) {
               res.setHeader('Content-type', 'application/json');
               res.send(JSON.stringify(subjects));
           });
       });
   } else {
       res.status(err.status || 500);
       res.render('error');
   }
});

router.get('/documents/:subject&:class', function (req, res) {
    if (req.session && req.session.user_id) {
        database.getUserClassName(req.session.user_id, function (error, className) {
            classUtils.getDocuments(req.params.subject, req.session.user_id, req.params.class !== 'null' ? req.params.class : className, function (files) {
                res.setHeader('Content-type', 'application/json');
                res.send(JSON.stringify(files));
            });
        });
    } else {
        res.status(err.status || 500);
        res.render('error');
    }
});

router.get('/getclasses', function (req, res) {
    if (req.session && req.session.user_id) {
        database.getAllClasses(function (classes) {
            res.setHeader('Content-type', 'application/json');
            res.send(JSON.stringify(classes));
        });
    } else {
        res.status(err.status || 500);
        res.render('error');
    }
});

router.get('/changefilevisability/:visability&:path', function (req, res) {
    console.log(req.params.visability)
    console.log(req.params.path)
        database.changeVisability(req.params.visability, req.session.user_id + '/' + req.params.path, function (error) {
            res.setHeader('Content-type', 'application/json');
            res.send(JSON.stringify([]));
        });
});

module.exports = router;