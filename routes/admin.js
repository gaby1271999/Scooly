var express = require('express');
var router = express.Router();
var database = require('./database.js');
var permissions = require('./permission.js');
var scheduleManager = require('./modules/schedule_manager.js');
var weekPlanning = require('./utils/week_planning.js');

/* GET home page. */
router.get('/', function(req, res) {
    permissions.hasPermission(req.session.user_id, 'admin.panel', function (result) {
        if (result) {
            permissions.getPermission(function (permission) {
                scheduleManager.createScheduleObject(function (scheduleObject) {
                    var weekPlanningObject = weekPlanning.getWeekPlanning();
                    res.render('admin', {
                        error: (req.query.result ? decodeURIComponent(req.query.result) : 0),
                        permission: permission,
                        schedules: scheduleObject,
                        weekPlanning: weekPlanningObject
                    });
                });
            });
        } else {
            res.redirect('/');
        }
    });
});

router.get('/addgroup/:username&:group_name', function (req, res) {
    if (req.session && req.session.user_id) {
        database.addGroup(req.params.username, req.params.group_name, function (error, result) {
            if (!error) {
                if (!error) {
                    database.getUserInformation(req.params.username, function (information) {
                        res.setHeader('Content-type', 'application/json');
                        res.send(information);
                    });
                } else {
                    res.setHeader('Content-type', 'application/json');
                    res.send([]);
                }
            } else {
                res.end("Group or user doesn\'t exists.")
            }
        });
    }
});

router.get('/removegroup/:username&:group_name?', function (req, res) {
    if (req.session && req.session.user_id) {
        database.removeGroup(req.params.username, req.params.group_name == undefined ? '' : req.params.group_name, function (error) {
            if (!error) {
                database.getUserInformation(req.params.username, function (information) {
                    res.setHeader('Content-type', 'application/json');
                    res.send(information);
                });
            } else {
                res.setHeader('Content-type', 'application/json');
                res.send([]);
            }
        });
    }
});

router.get('/addtoclass/:username/:class_name?', function (req, res) {
    if (req.session && req.session.user_id) {
        database.addUserToClass(req.params.username, req.params.class_name == undefined ? '' : req.params.class_name, function (error) {
            if (!error) {
                database.getUserInformation(req.params.username, function (information) {
                    res.setHeader('Content-type', 'application/json');
                    res.send(information);
                });
            } else {
                res.setHeader('Content-type', 'application/json');
                res.send([]);
            }
        });
    }
});

router.get('/deleteuser/:username', function (req, res) {
    if (req.session && req.session.user_id) {
        console.log('test');
        database.deleteUser(req.params.username, function () {
            console.log('test2');
            res.end();
        });
    }
});

module.exports = router;