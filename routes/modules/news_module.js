var database = require(__dirname.replace('modules', 'database'));
var permissionManager = require(__dirname.replace('modules', 'permission'));
var async = require('async');

/*
function getNews(callback) {
    var connection = database.getConnection();

    var sql = "SELECT id, title, description, DATE_FORMAT(date, \"%d-%m-%Y %H:%i\") AS date FROM news"
    connection.query(sql, function (error, results) {
        if (!error) {
            callback(results);
        }
    })
}*/

function toDate(date) {
    var stripeArgs = date.split("-");
    var day = stripeArgs[0];
    var month = stripeArgs[1]-1;
    var thirdArg = stripeArgs[2].split(" ");
    var year = thirdArg[0];
    var timeInArgs = thirdArg[1].split(":");
    var hour = timeInArgs[0];
    var minutes = timeInArgs[1];

    return new Date(year, month, day, hour, minutes);
}

function getArticles(callback) {
    var connection = database.getConnection();

    var sql = "SELECT id, title, description, DATE_FORMAT(date, \"%d-%m-%Y %H:%i\") AS date FROM news";
    connection.query(sql, function (error, results) {
        if (!error) {
            var list = [];

            async.each(results, function (result, cb) {
                var object = {id: result.id, title: result.title, description: result.description, date: result.date}

                var sqlGroups = "SELECT * FROM news_cansee WHERE news_id=?;";
                connection.query(sqlGroups, [result.id], function (error, results) {
                    if (!error) {
                        var groups = []

                        for (var index in results) {
                            groups[groups.length] = results[index].group_name;
                        }

                        object['groups'] = groups;
                    }

                    list[list.length] = object;
                    cb();
                });
            }, function () {
                callback(list);
            });
        } else {
            callback([]);
        }
    });
}

function getNews(user_id, from, to, callback) {
    getArticles(function (results) {
        console.log(results);

        if (results.length > 0) {
            var list = [];

            async.each(results, function (result, cb) {
                canSee(result.groups, user_id, function (cansee) {
                    if (cansee) {
                        list[list.length] = result;
                    }

                    cb();
                });
            }, function () {
                if (!((to - from) < 0) && !((to - from) > 5)) {
                    var sortedResults = list.sort(function (a, b) {
                        var aDate = toDate(a.date);
                        var bDate = toDate(b.date);

                        return bDate-aDate;
                    });

                    var newList = [];
                    for (var index in sortedResults) {
                        if (index >= from && index <= to) {
                            newList[newList.length] = sortedResults[index];
                        }
                    }

                    return callback(newList);
                }
            });
        }
    });
}

function canSee(articleGroups, user_id, callback) {
    if (articleGroups.length > 0) {
        permissionManager.hasPermission(user_id, 'news.edit', function (result) {
            if (result) {
                callback(true);
            } else {
                database.getGroup(user_id, function (groups) {
                    async.each(groups, function (group, cb) {
                        var groupsList = permissionManager.getParents(group, [], permissionManager.groups);
                        groupsList[groupsList.length] = group;

                        var perms = false;

                        for (var index in groupsList) {
                            for (var i in articleGroups) {
                                if (groupsList[index] == articleGroups[i]) {
                                    perms = true;
                                    break;
                                }
                            }
                        }

                        if (perms) {
                            cb({hasperms: true});
                        } else {
                            cb();
                        }
                    }, function (error) {
                        if (error) {
                            callback(true);
                        } else {
                            callback(false);
                        }
                    });
                });
            }
        });
    } else {
        callback(true);
    }
}

exports.getNews = getNews;




