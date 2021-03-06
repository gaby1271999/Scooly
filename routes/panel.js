var express = require('express');
var async = require('async');
var router = express.Router();
var lm = require('./modules/language_module');
var database = require('./database');
var permission = require('./permission');

var messageManager = require('./modules/message_module');
var scheduleManager = require('./modules/schedule_manager');
var weekPlanning = require('./utils/week_planning.js');
var classUtils = require('./modules/class_utils');
var attachments = require('./utils/attachment');


/* GET home page. */
router.get('/:page?', function(req, res) {
    if (req.session && req.session.user_id) {
        lm.getFile(req, function (dir) {
            database.getUsername(req.session.user_id, function (error, username) {
                database.getUserClassName(req.session.user_id, function (error, className) {
                    if (error) {
                        className = "";
                    }

                    var weekPlanningObject = weekPlanning.getWeekPlanning();

                    async.series([
                        //get student schedule
                        function (cb) {
                            scheduleManager.getStudentWeek(className, function (weekObject) {
                                cb(null, weekObject);
                            });
                        },

                        //get teacher schedule
                        function (cb) {
                            scheduleManager.getTeacherWeek(username, function (weekObject) {
                                cb(null, weekObject);
                            });
                        }],

                        function (err, results) {
                            if (!err) {
                                var weekObject;

                                if (results[0] != null) {
                                    weekObject = results[0];
                                } else {
                                    weekObject = results[1];
                                }

                                console.log(req.params.page);

                                res.render('panel', {
                                    object: lm.createObject(dir),
                                    profile_pic: req.session.user_id,
                                    username: username,
                                    menu: 'news',
                                    week: weekObject,
                                    weekPlanning: weekPlanningObject,
                                    page: (req.params.page == undefined) ? "" : req.params.page
                                });
                            }
                        });
                })
            })
        })
    } else {
        lm.getFile(req, function (dir) {
            res.render('index', {error: "First login!", object: lm.createObject(dir)});
        });
    }
});

router.get('/removenews/:article_id', function (req, res) {
    if (req.session && req.session.user_id) {
        permission.hasPermission(req.session.user_id, "news.remove", function (result) {
            if (result) {
                database.removeNewsArticle(req.params.article_id, function (result) {
                    res.end('success');
                });
            }
        });
    }
});

router.post('/editnews', function (req, res) {
    if (req.session && req.session.user_id) {
        permission.hasPermission(req.session.user_id, "news.edit", function (result) {
            console.log(req.body)
            console.log(req.body.groups)
            console.log(JSON.parse(req.body.groups))

            if (result) {
                if (req.body.title != undefined) {
                    if (req.body.title.length <= 30) {
                        if (req.body.id != undefined) {
                            if (req.body.id.length > 0) {
                                database.updateNewsArticle(req.body.id, req.body.title, req.body.description, JSON.parse(req.body.groups), function (result) {
                                    res.end('success');
                                });
                            } else {
                                database.addNewsArticle(req.body.title, req.body.description, JSON.parse(req.body.groups), function (result) {
                                    res.end('success');
                                });
                            }
                        } else {
                            database.addNewsArticle(req.body.title, req.body.description, JSON.parse(req.body.groups), function (result) {
                                res.end('success');
                            });
                        }
                    }
                }
            }
        });
    }
});

function typeNameToId(type) {
    switch (type) {
        case 'note':
            return 1;
        case 'test':
            return 2;
        case 'task':
            return 3;
        case 'preparation':
            return 4;
        case 'materials':
            return 5;
        case 'topic':
            return 6;
        default:
            return 1;
    }
}

router.post('/addagendaitem', function (req, res) {
    if (req.session && req.session.user_id) {
        permission.hasPermission(req.session.user_id, "agenda.additem." + req.body.type, function (result) {
            if (result) {
                if (req.body.type != 1 && !(req.body.group_name.length > 0)) {
                    res.redirect('/panel/schoolschedule');
                } else {
                    database.addAgendaItem(req.body.delivery_date, req.body.period, typeNameToId(req.body.type), req.session.user_id, req.body.title, req.body.description, (typeNameToId(req.body.type) != 1) ? req.body.group_name : null, function (succes) {
                        if (succes) {
                            res.redirect('/panel/schoolschedule');
                        }
                    });
                }
            }
        });
    }
});

function getMailIdsConverter(to_names, cc_names, bcc_names, callback) {
    var to = JSON.parse(to_names);
    var cc = JSON.parse(cc_names);
    var bcc = JSON.parse(bcc_names);

    async.series([
        function (callback) {
            var to_ids = [];

            async.each(to, function (t, cb) {
                database.getUserId(t, function (error, id) {
                    if (!error) {
                        to_ids[to_ids.length] = id;
                    }

                    cb();
                });
            }, function () {
                callback(null, to_ids);
            });
        },

        function (callback) {
            var cc_ids = [];

            async.each(cc, function (c, cb) {
                database.getUserId(c, function (error, id) {
                    if (!error) {
                        cc_ids[cc_ids.length] = id;
                    }

                    cb();
                });
            }, function () {
                callback(null, cc_ids);
            });
        },

        function (callback) {
            var bcc_ids = [];

            async.each(bcc, function (b, cb) {
                database.getUserId(b, function (error, id) {
                    if (!error) {
                        bcc_ids[bcc_ids.length] = id;
                    }

                    cb();
                });
            }, function () {
                callback(null, bcc_ids);
            });
        }
    ], function (error, results) {
        callback(results[0], results[1], results[2]);
    });
}

router.post('/sendmail/:id?', function (req, res) {
    if (req.session && req.session.user_id) {
        getMailIdsConverter(req.body.to, req.body.cc, req.body.bcc, function (res1, res2, res3) {
            if (req.params.id != undefined) {
                database.sendConcept(req.params.id, req.session.user_id, res1, res2, res3, req.body.title, req.body.body, function (error) {
                    res.redirect('/panel');
                });
            } else {
                database.sendMail(req.session.user_id, res1, res2, res3, req.body.title, req.body.body, function (error) {
                    console.log(error)
                    res.redirect('/panel');
                });
            }
        });
    }
});

router.post('/sendconcept/:mail_id?', function (req, res) {
    if (req.session && req.session.user_id) {
        if (req.params.mail_id != undefined) {
            getMailIdsConverter(req.body.to, req.body.cc, req.body.bcc, function (res1, res2, res3) {
                database.updateConcept(req.params.mail_id, req.session.user_id, res1, res2, res3, req.body.title, req.body.body, function (error) {
                    attachments.updateAttachment(req.params.mail_id, req.session.user_id, function () {
                        res.redirect('/panel');
                    });
                });
            });
        } else {
            getMailIdsConverter(req.body.to, req.body.cc, req.body.bcc, function (res1, res2, res3) {
                database.addConcept(req.session.user_id, res1, res2, res3, req.body.title, req.body.body, function (error) {
                    res.redirect('/panel');
                });
            });
        }
    }
});

router.post('/uploadsubjectfile', function (req, res) {
    if (req.session && req.session.user_id) {
        var uploadDirection = __dirname.replace("routes", "private/uploads/") + req.files.file.name;

        req.files.file.mv(uploadDirection, function (error) {
            if (!error) {
                var url = encodeURIComponent('subject/' + req.body.path);

                classUtils.uploadNewFile(req.session.user_id, req.body.path + '/' + req.files.file.name, uploadDirection, function (result) {
                    res.redirect('/panel/' + url);
                });
            } else {
                console.log(error);
            }
        });
    }
});

router.post('/addfolder', function (req, res) {
    if (req.session && req.session.user_id) {
        var path = req.session.user_id + '/' + req.body.path + '/' + req.body.folder;

        var url = encodeURIComponent('subject/' + req.body.path);

        classUtils.addFolder(path, function (result) {
            res.redirect('/panel/' + url);
        });
    }
});

router.post('/addnote', function (req, res) {
    if (req.session && req.session.user_id) {
        var pathArgs = req.body.path.split('/');
        pathArgs.pop();

        var newPath = '';
        for (var i in pathArgs) {
            newPath += '/' + pathArgs[i];
        }

        var url = encodeURIComponent('subject' + newPath);

        if (req.body.id.length == 0) {
            database.addSubjectNote(req.session.user_id, req.body.title, req.body.description, req.session.user_id + '/' + req.body.path, req.body.public == 'on' ? 1 : 0, function (error) {
                res.redirect('/panel/' + url);
            });
        } else {
            database.editSubjectNote(req.body.id, req.body.title, req.body.description, req.body.public == 'on' ? 1 : 0, function (error) {
                res.redirect('/panel/' + url);
            });
        }
    }
});

router.post('/edititem', function (req, res) {
    if (req.session && req.session.user_id) {
        var typeId = typeNameToId(req.body.type);
        database.editAgendaItem(req.body.id, req.body.delivery_date, req.body.period, typeId, req.body.title, req.body.description, typeId == 1 ? null : req.body.group_name, function (result) {
            res.redirect('/panel/schoolschedule');
        });
    }
});

router.post('/deleteitem', function (req, res) {
    if (req.session && req.session.user_id) {
        console.log('called' + req.body.id)
        if (req.body.id != undefined) {
            database.removeAgendaItem(req.body.id, req.session.user_id, function (result) {
                res.redirect('/panel/schoolschedule');
            });
        }
    }
});

module.exports = router;