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

router.post('/addnews', function (req, res) {
    if (req.session && req.session.user_id) {
        database.getGroup(req.session.user_id, function (groupName) {
            permission.hasPermission(groupName, "news.add", function (result) {
                if (result) {
                    if (req.body.title.length <= 30) {
                        database.addNewsArticle(req.body.title, req.body.description, function (result) {
                            res.redirect('/panel')
                        });
                    }
                }
            });
        });
    }
});

router.post('/removenews', function (req, res) {
    if (req.session && req.session.user_id) {
        database.getGroup(req.session.user_id, function (groupName) {
            permission.hasPermission(groupName, "news.remove", function (result) {
                if (result) {
                    database.removeNewsArticle(req.body.article_id, function (result) {
                        res.redirect('/panel')
                    });
                }
            });
        });
    }
});

router.post('/editnews', function (req, res) {
    if (req.session && req.session.user_id) {
        database.getGroup(req.session.user_id, function (groupName) {
            permission.hasPermission(groupName, "news.edit", function (result) {
                if (result) {
                    if (req.body.title.length <= 30) {
                        database.updateNewsArticle(req.body.article_id, req.body.title, req.body.description, function (result) {
                            res.redirect('/panel')
                        });
                    }
                }
            });
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
        database.getGroup(req.session.user_id, function (groupName) {
            permission.hasPermission(groupName, "agenda.additem." + req.body.type, function (result) {
                if (result) {
                    database.addAgendaItem(req.body.delivery_date, req.body.period, typeNameToId(req.body.type), req.session.user_id, req.body.title, req.body.description, (typeNameToId(req.body.type) != 1) ? req.body.group_name : null, function (succes) {
                        if (succes) {
                            res.redirect('/panel/schoolschedule');
                        }
                    });
                }
            });
        });
    }
});

router.post('/sendmail', function (req, res) {
    if (req.session && req.session.user_id) {
        console.log(req.body)

        var to = [];
        if (req.body.to != undefined) {
            if (req.body.to.constructor === Array) {
                to = req.body.to;
            } else {
                to[to.length] = req.body.to;
            }
        }

        var cc = [];
        if (req.body.cc != undefined) {
            if (req.body.cc.constructor === Array) {
                cc = req.body.cc;
            } else {
                cc[cc.length] = req.body.cc;
            }
        }

        var bcc = [];
        if (req.body.bcc != undefined) {
            if (req.body.bcc.constructor === Array) {
                bcc = req.body.bcc;
            } else {
                bcc[bcc.length] = req.body.bcc;
            }
        }

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
            database.sendMail(req.session.user_id, results[0], results[1], results[2], req.body.title, req.body.content, function (error) {
                res.redirect('/panel');
            });
        });
    }
});

router.post('/uploadsubjectfile', function (req, res) {
    if (req.session && req.session.user_id) {
        var uploadDirection = __dirname.replace("routes", "private/uploads/") + req.files.file.name;

        req.files.file.mv(uploadDirection, function (error) {
            if (!error) {
                classUtils.uploadNewFile(req.session.user_id, req.body.path + '/' + req.files.file.name, uploadDirection, function (result) {
                    res.redirect('/panel/subject');
                });
            } else {
                console.log(error);
            }
        });
    }
});

router.post('/addfolder', function (req, res) {
    if (req.session && req.session.user_id) {
        var path = req.session.user_id + '/' + req.body.path + '/' + req.body.directory;

        classUtils.addFolder(path, function (result) {
            res.redirect('/panel/subject');
        });
    }
});

router.post('/addnote', function (req, res) {
    if (req.session && req.session.user_id) {
        if (req.body.id.length == 0) {
            database.addSubjectNote(req.session.user_id, req.body.title, req.body.description, req.session.user_id + '/' + req.body.path, req.body.public == 'on' ? 1 : 0, function (error) {
                res.redirect('/panel/subject');
            });
        } else {
            database.editSubjectNote(req.body.id, req.body.title, req.body.description, req.body.public == 'on' ? 1 : 0, function (error) {
                res.redirect('/panel/subject');
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