var express = require('express');
var database = require('./database.js');
var permissions = require('./permission.js');
var scheduleManager = require('./modules/schedule_manager.js');
var router = express.Router();

router.post('/adduser', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var passwordCheck = req.body.password_check;
    var groupName = req.body.group_name;
    var userClass = req.body.class;

    if (password !== passwordCheck) {
        var encodedString = encodeURIComponent('Passwords are not the same');
        res.redirect('/admin/?result=' + encodedString);
    }

    if (!permissions.isExistingGroup(groupName, permissions.groups)) {
        var encodedString = encodeURIComponent('Group does not exists');
        res.redirect('/admin/?result=' + encodedString);
    } else {
        if (userClass.length == 0) {
            database.addUser(username, password, groupName, 0, function (result) {
                var encodedString = encodeURIComponent(result);
                res.redirect('/admin/?result=' + encodedString);
            });
        } else {
            database.getClassId(userClass, function (error, classId) {
                if (!error) {
                    database.addUser(username, password, groupName, classId, function (result) {
                        var encodedString = encodeURIComponent(result);
                        res.redirect('/admin/?result=' + encodedString);
                    });
                } else {
                    var encodedString = encodeURIComponent('Class does not exists');
                    res.redirect('/admin/?result=' + encodedString);
                }
            });
        }
    }
});

router.post('/user_list', function(req, res) {
    var usernames = req.body.username.toString();

    var array = [];
    var name = "";
    var counter = 0;
    for (var i = 0; i <= usernames.length; i++) {
        if (usernames[i] == ',' || i == usernames.length) {
            array[counter] = name;
            name = "";
            counter++;
        } else {
            name = name.concat(usernames[i]);
        }
    }

    for (var user in array) {
        database.removeUser(array[user], function (result) {
            var encodedString = encodeURIComponent(result);
            res.redirect('/admin/?result=' + encodedString);
        });
    }
});

router.post('/user_group', function(req, res) {
    for (var field in req.body) {
        if (field != 'username') {
            database.changeUserGroup(field, req.body[field]);
        }
    }

    var encodedString = encodeURIComponent('changed group.');
    res.redirect('/admin/?result=' + encodedString);
});

router.post('/user_class', function(req, res) {
    var list = [];

    console.log(req.body)
    for (var i = 0; i < Object.keys(req.body).length; i++) {
        console.log(req.body)

        var object = {};
        var key = Object.keys(req.body)[i];

        object[key] = req.body[key];

        list[list.length] = object;
    }

    database.addToClass(list, function (error, result) {
        console.log(error)
        console.log(result)

        if (!error) {
            var encodedString = encodeURIComponent('updates the users.');
            res.redirect('/admin/?result=' + encodedString);
        } else {
            var encodedString = encodeURIComponent('Couldn\'t update users data.');
            res.redirect('/admin/?result=' + encodedString);
        }
    });
});

router.post('/addgroup', function (req, res) {
    permissions.addNewGroup(req.body.group_name, req.body.department, function (result) {
        var encodedString = encodeURIComponent(result);
        res.redirect('/admin/?result=' + encodedString);
    })
});

router.post('/removegroup', function (req, res) {
    permissions.removeNewGroup(req.body.group_name, function (result) {
        var encodedString = encodeURIComponent(result);
        res.redirect('/admin/?result=' + encodedString);
    })
});

router.post('/permission', function (req, res) {
    for (var name in req.body) {
        var list = name.split("-");
        var group = list[0];
        var perm = list[1];


        if (req.body[name] > 0) {
            permissions.addPermission(group, perm);
        } else {
            permissions.removePermission(group, perm);
        }
    }

    var encodedString = encodeURIComponent('Permission file has been modified.');
    res.redirect('/admin/?result=' + encodedString);
});

router.post('/schedules', function (req, res) {
    console.log(req.body)
   for (var name in req.body) {
       console.log(name + req.body[name]);
       scheduleManager.changeActivatedSchedule(name, req.body[name]);
   }

    var encodedString = encodeURIComponent('Activated schedules have been changed.');
    res.redirect('/admin/?result=' + encodedString);
});

router.post('/addclass', function (req, res) {
    database.classExists(req.body.class_name, function (result) {
        if (!result) {
            database.addClass(req.body.class_name, function () {
                var encodedString = encodeURIComponent('Class has been added.');
                res.redirect('/admin/?result=' + encodedString);
            });
        } else {
            var encodedString = encodeURIComponent('Class could not be added.');
            res.redirect('/admin/?result=' + encodedString);
        }
    });
});

router.post('/removeclass', function (req, res) {
    database.removeFromClass(req.body.class_name, function (error) {
        database.removeClassByName(req.body.class_name, function () {
            var encodedString = encodeURIComponent('Class has been removed.');
            res.redirect('/admin/?result=' + encodedString);
        });
    });
});

module.exports = router;