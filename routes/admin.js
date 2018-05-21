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

module.exports = router;