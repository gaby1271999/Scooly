var config = require('yaml-config');
var async = require('async');
var database = require('./database');


var groups = config.readConfig(__dirname.replace("routes", "private/configs/permissions.yml"), "groups");
var permissions = config.readConfig(__dirname.replace("routes", "private/configs/permissions.yml"), "permissions");

function updateGroups() {
    config.updateConfig(groups, __dirname.replace("routes", "private/configs/permissions.yml"), "groups");
}

function addGroup(name, department, object) {
    if (!isExistingGroup(name, object)) {
        if (department.length == 0) {
            var group = {permissions: []};

            object[name] = group;

            updateGroups();
            return;
        }

        if (getGroupObject(department, object) != undefined) {
            var group = {permissions: []};

            getGroupObject(department, object)[name] = group;

            updateGroups();
            return;
        }
    }
}

function removeGroup(name, object) {
    if (isExistingGroup(name, object)) {
        if (getGroupObject(name, object) != undefined) {
            var parentObject = getParentObject(name, "", groups);

            if (parentObject.length == 0) {
                delete groups[name];
            } else {
                delete parentObject[name];
            }

            updateGroups();
            return;
        }
    }
}

function getGroupPerms(name, object) {
    if (getGroupObject(name, object)) {
        return getGroupObject(name, object)['permissions'];
    }
}

function getGroupObject(name, object) {
    if (isExistingGroup(name, object)) {
        for (var field in object) {
            if (field != 'permissions') {
                if (field == name) {
                    return object[field];
                }
            }
        }

        for (var field in object) {
            if (field != 'permissions') {
                if (getGroupObject(name, object[field])) {
                    return getGroupObject(name, object[field]);
                }
            }
        }
    }
}

function getParentObject(name, parentObject, object) {
    if (isExistingGroup(name, object)) {
        for (var field in object) {
            if (field != 'permissions') {
                if (field == name) {
                    return parentObject;
                }
            }
        }

        for (var field in object) {
            if (field != 'permissions') {
                if (getParentObject(name, object[field], object[field])) {
                    return getParentObject(name, object[field], object[field]);
                }
            }
        }
    }
}

function isExistingGroup(name, object) {
    for (var field in object) {
        if (field != 'permissions') {
            if (field == name) {
                return true;
            }
        }
    }

    for (var field in object) {
        if (field != 'permissions') {
            try {
                if (isExistingGroup(name, object[field])) {
                    return true;
                }
            } catch (err) {

            }
        }
    }
}

function addPermission(group, permission) {
    var groupObject = getGroupObject(group, groups);
    if (groupObject != undefined) {
        var permissionList = groupObject['permissions'];

        if (permissionList.length < 1) {
            permissionList[0] = permission;
        } else {
            var contains = false;
            for (var index in permissionList) {
                if (permissionList[index] == permission) {
                    contains = true;
                    continue;
                }
            }

            if (!contains) {
                permissionList[permissionList.length] = permission;
            }
        }

        groupObject['permissions'] = permissionList;

        updateGroups();
    }
}

function removePermission(group, permission) {
    var groupObject = getGroupObject(group, groups);
    if (groupObject != undefined) {
        var permissionList = groupObject['permissions'];

        if (permissionList.length < 1) {
            return;
        } else {
            var newPermissionList = [];
            var counter = 0;
            for (var index in permissionList) {
                if (permissionList[index] != permission) {
                    newPermissionList[counter] = permissionList[index];
                    counter++;
                }
            }
        }

        groupObject['permissions'] = newPermissionList;

        updateGroups();
    }
}

function getParents(name, parents, object) {
    for (var field in object) {
        if (field == name) {
            return [];
        }
    }

    for (var field in object) {
        if (field != 'permissions') {
            if (getParents(name, parents, object[field])) {
                parents[parents.length] = field;
                return parents;
            }
        }
    }
}

function hasPermission(user_id, perm, callback) {
    database.getGroup(user_id, function (grps) {
        var hasPerms = false;

       async.each(grps, function (group, cb) {
           var groupsList = getParents(group, [], groups);
           groupsList[groupsList.length] = group;

           for (var index in groupsList) {
               var perms = getGroupPerms(groupsList[index], groups);

               for (var permIndex in perms) {
                   if (perm == perms[permIndex]) {
                       hasPerms = true;
                       break;
                   }
               }
           }

           cb();
       }, function () {
            callback(hasPerms);
       });
    });
}

function getAllGroups(object) {
    var groups = [];

    for (var field in object) {
        if (field != 'permissions') {
            groups[groups.length] = field;
        }
    }

    for (var field in object) {
        if (field != 'permissions') {
            var fields = getAllGroups(object[field]);

            for (var index in fields) {
                groups[groups.length] = fields[index];
            }
        }
    }

    return groups;
}

function getPermission(callback) {
    var object = {};

    object['groups'] = groups;
    object['permissions'] = permissions;
    callback(object);
}

function addNewGroup(name, department, callback) {
    addGroup(name, department, groups);

    callback('added');
}

function removeNewGroup(name, callback) {
    removeGroup(name, groups);

    callback('removed');
}

exports.getPermission = getPermission;
exports.addPermission = addPermission;
exports.removePermission = removePermission;
exports.addNewGroup = addNewGroup;
exports.removeNewGroup = removeNewGroup;
exports.hasPermission = hasPermission;
exports.isExistingGroup = isExistingGroup;
exports.groups = groups;
exports.getAllGroups = getAllGroups;

