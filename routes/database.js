var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var async = require('async');
var fs = require('fs');
var fse = require('fs-extra');
var permissionManager = require('./permission');

var connection;

function getConnection() {
    return connection;
}

function connect() {
    connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'scooly'
    });

    connection.connect(function (error) {
        if (error) {
            console.log(error);
        } else {
            console.log("connected to the database.")
        }
    });

    connection.on('error', function (err) {
        if (err.code  === 'PROTOCOL_CONNECTION_LOST') {
            connect();
        } else {
            throw err;
        }
    });
}

function login(username, password, callback) {
    var sql = "SELECT * FROM users WHERE username=" + connection.escape(username) + ";";
    connection.query(sql, function (error, rows) {
       if (error) {
           callback(false);
       } else {
           if (rows.length == 1) {
               bcrypt.compare(password, rows[0].password, function (error, result) {
                   if (error) {
                       callback(false);
                   } else {
                       if (result == true) {
                           callback(true, rows[0].id);
                       } else {
                           callback(false);
                       }
                   }
               });
           } else {
               callback(false);
           }
       }
    });
}

function getUsername(user_id, callback) {
    var sql = "SELECT * FROM users WHERE id=" + user_id + ";";
    connection.query(sql, function (error, rows) {
        if (!error) {
            if (rows.length == 1) {
                return callback(null, rows[0].username);
            }
        }

        callback('ERROR');
    });
}

function getPassword(user_id, callback) {
    var sql = "SELECT password FROM users WHERE id=" + user_id + ";";
    connection.query(sql, function (error, rows) {
        if (!error) {
            if (rows.length == 1) {
                callback(rows[0].password);
            }
        }
    });
}

function getGroup(user_id, callback) {
    var sql = "SELECT group_name FROM permission WHERE user_id=" + user_id + ";";
    connection.query(sql, function (error, rows) {
        if (!error) {
            if (rows.length > 0) {
                var list = [];

                async.each(rows, function (row, cb) {
                    list[list.length] = row.group_name;
                    cb();
                }, function () {
                    callback(list);
                });
            }
        } else {
            callback([]);
        }
    })
}

function getUsers(callback) {
    var sql = "SELECT * FROM users;";

    connection.query(sql, function (error, results) {
        if (!error) {
            var list = [];
            async.each(results, function (result, cb) {
                list[list.length] = result.username;
                cb();
            }, function (error) {
                if (!error) {
                    callback(null, list);
                } else {
                    callback(error);
                }
            });
        } else {
            callback(error);
        }
    });
}

function getUserId(username, callback) {
    var sql = "SELECT id FROM users WHERE username=\"" + username + "\";";
    connection.query(sql, function (error, rows) {
        if (!error) {
            if (rows != undefined) {
                if (rows.length == 1) {
                    return callback(null, rows[0].id);
                }
            }
        }

        callback(true);
    });
}

function deleteUser(username, callback) {
    getUserId(username, function (error, user_id) {
       if (!error) {
           //TABLES TO DELETE FROM
           /*

           file_visability
           permission
           subject_notes
           user_class
           users

            */

           async.series([
               function (cb) {
                   var sql = "SELECT * FROM file_visability;";
                   
                   connection.query(sql, function (error, results) {
                      if (!error) {
                          async.each(results, function (result, callb) {
                              var file_user_id =  result.path.split('/');
                              
                              if (user_id == file_user_id) {
                                  var sqlDelete = "DELETE FROM file_visability WHERE id=?;";
                                  
                                  connection.query(sqlDelete, [result.id], function () {
                                      callb();
                                  });
                              } else {
                                  callb();
                              }
                          }, function () {
                              cb();
                          });
                      } else {
                          cb();
                      }
                   });
               },

               function (cb) {
                   var sqlDelete = "DELETE FROM subject_notes WHERE user_id=?;";

                   connection.query(sqlDelete, [user_id], function () {
                       cb();
                   });
               },

               function (cb) {
                   var path = __dirname.replace('routes', 'private/subjects/' + user_id);

                   if (fs.existsSync(path)) {
                       fse.remove(path, function (error) {
                           console.log(error)
                          cb();
                       });
                   } else {
                       cb();
                   }
               },
               
               function (cb) {
                   var sqlDelete = "DELETE FROM permission WHERE user_id=?;";
                   
                   connection.query(sqlDelete, [user_id], function (error, result) {
                       cb();
                   });
               },

               function (cb) {
                   var sqlDelete = "DELETE FROM user_class WHERE user_id=?;";

                   connection.query(sqlDelete, [user_id], function () {
                       cb();
                   });
               },


               function (cb) {
                   var sqlDelete = "DELETE FROM users WHERE id=?;";

                   connection.query(sqlDelete, [user_id], function () {
                       cb();
                   });
               },
           ], function () {
              callback();
           });
       } else {
           callback();
       }
    });
}

function addUser(username, password, groupName, classId, callback) {
    connection.escape(username);
    connection.escape(password);

    var checksql = "SELECT username FROM users WHERE username=\"" + username + "\";";
    connection.query(checksql, function (error, rows) {
        if (!error) {
            if (rows.length == 0) {
                bcrypt.hash(password, 10, function (error, hash) {
                    if (!error) {
                        var updateSQL = "INSERT INTO users(username, password) VALUES(\"" + username + "\", '" + hash + "');";
                        connection.query(updateSQL, function (error) {
                            if (!error) {
                                getUserId(username, function (error, user_id) {
                                    if (!error) {
                                        var insertGroupSql = "INSERT INTO permission(user_id, group_name) VALUES(" + user_id + ", \"" + groupName + "\")"
                                        connection.query(insertGroupSql, function (error) {
                                            if (!error) {
                                                if (classId > 0) {
                                                    addUserToClass(user_id, classId, function (error) {
                                                        if (!error) {
                                                            return callback("You added the user " + username + " to the school users!");
                                                        }
                                                    });
                                                } else {
                                                    return callback("You added the user " + username + " to the school users!");
                                                }
                                            } else {
                                                callback("A problem has occurred.");
                                            }
                                        });
                                    } else {
                                        callback("A problem has occurred.");
                                    }
                                });
                            } else {
                                callback("A problem has occurred.");
                            }
                        });
                    } else {
                        callback("A problem has occurred.");
                    }
                });
            } else {
                callback("The given username has already been taken!");
            }
        } else {
            callback("A problem has occurred.");
        }
    });
}

function changePassword(id, oldPassword, newPassword, callback) {
    var sql = "SELECT password FROM users WHERE id=" + id + ";";

    console.log("test");
    connection.query(sql, function (error, result) {
        console.log(result[0].password);
        bcrypt.compare(oldPassword, result[0].password, function (error, correct) {
            console.log(error);
            if (correct) {
                console.log("test");
                bcrypt.hash(newPassword, 10, function (error, hash) {
                    console.log(hash);
                    var sql = "UPDATE users SET password='" + hash + "' WHERE id=" + id + ";";
                    connection.query(sql, function (error, success) {
                        console.log(error);
                        if (success) {
                            callback(true);
                        }
                    })
                })
            }
        })
    })

    callback(false);
}

function getUserProfilePic(user_id, callback) {
    var sql = "SELECT photo_path_id FROM user_info WHERE user_id=" + user_id + ";";
    connection.query(sql, function (error, rows) {
       if (!error) {
           if (rows.length == 1) {
               callback(rows[0].photo_path_id);
           }
       }
    });
}

function containsGroup(user_id, group, callback) {
    getGroup(user_id, function (groups) {
        var contains = false;

        for (var index in groups) {
            if (groups[index] == group) {
                contains = true;
                break;
            }
        }

        callback(contains);
    });
}

function addGroup(username, group_name, callback) {
    getUserId(username, function (error, user_id) {
        if (!error) {
            containsGroup(user_id, group_name, function (contains) {
                if (!contains) {
                    if (permissionManager.isExistingGroup(group_name, permissionManager.groups)) {
                        var sql = "INSERT INTO permission(user_id, group_name) VALUES(?, ?);";

                        connection.query(sql, [user_id, group_name], function (error, result) {
                            if (!error) {
                                callback(false, true);
                            }  else {
                                callback(error);
                            }
                        });
                    } else {
                        callback('ERROR');
                    }
                } else {
                    callback(null);
                }
            });
        } else {
            callback(error);
        }
    })
}

function removeGroup(username, group_name, callback) {
    getUserId(username, function (error, user_id) {
        if (!error) {
            var sql = "DELETE FROM permission WHERE user_id=? AND group_name=?";

            connection.query(sql, [user_id, group_name], function (error, result) {
                callback(error);
            });
        } else {
            callback(error);
        }
    })
}

function changeUserGroup(username, oldGroup, group, callback) {
    getUserId(username, function (error, user_id) {
        if (!error) {
            containsGroup(user_id, group, function (contains) {
               if (!contains) {
                   var sql = "SELECT * FROM permission WHERE user_id=? AND group_name=?;";

                   connection.query(sql, [user_id, oldGroup], function (error, results) {
                       if (!error) {
                           if (results.length == 1) {
                               var sqlUpdate = "UPDATE permission SET group_name=? WHERE user_id=? AND id=?;";

                               connection.query(sqlUpdate, [group, user_id, results[0].id], function (error) {
                                   callback(error);
                               });
                           } else if (results.length == 0) {
                               var sqlInsert = "INSERT INTO permission(user_id, group_name) VALUES(?, ?);";

                               connection.query(sqlInsert, [user_id, group], function (error) {
                                   callback(error);
                               });
                           } else {
                               callback('ERROR');
                           }
                       } else {
                           callback(error);
                       }
                   });
               } else {
                   callback('ERROR');
               }
            });
        } else {
            callback(error);
        }
    });
}

function removeUser(username, callback) {
    var sql = "DELETE from users WHERE username=\"" + username + "\";";
    connection.query(sql, function (error, result) {
        if (!error) {
            callback("User " + username + " was removed from the school system.");
        } else {
            callback("The user could not removed.");
        }
    });
}

function addNewsArticle(title, description, groups, callback) {
    var sql = "INSERT INTO news(title, description, date) VALUES(" + connection.escape(title) + ", " + connection.escape(description) + ", NOW());";
    connection.query(sql, function (error, result) {
        if (!error) {
            async.each(groups, function (group, cb) {
               var sqlAddGroup = "INSERT INTO news_cansee(news_id, group_name) VALUES(?, ?);";

               connection.query(sqlAddGroup, [result.insertId, group], function (error, result) {
                   cb();
               });
            }, function () {
                return callback(false);
            });
        } else {
            return callback(true);
        }
    });
}

function removeNewsArticle(id, callback) {
    var sql = "DELETE FROM news WHERE id=" + id + ";";
    connection.query(sql, function (error) {
        if (!error) {
            var sqlGroups = "SELECT * FROM news_cansee WHERE news_id=?;";
            connection.query(sqlGroups, [id], function (error, results) {
               if (!error) {
                   async.each(results, function (result, cb) {
                      var sqlDelete = "DELETE FROM news_cansee WHERE id=?;";

                      connection.query(sqlDelete, [result.id], function () {
                         cb();
                      });
                   }, function () {
                       return callback(false);
                   });
               } else {
                   return callback(true);
               }
            });
        } else {
            return callback(true);
        }
    });
}

function updateNewsArticle(id, title, description, groups, callback) {
    var sql = "UPDATE news SET title=" + connection.escape(title) + ", description=" + connection.escape(description) + " WHERE id=" + id + ";";
    connection.query(sql, function (error, result) {
        if (!error) {
            var sqlGroups = "SELECT * FROM news_cansee WHERE news_id=?;";

            connection.query(sqlGroups, [id], function (error, results) {
                if (!error) {
                    async.each(results, function (result, cb) {
                        console.log(result);

                        var inGroups = false;

                        for (var index in groups) {
                            if (groups[index] == result.groups_name) {
                                inGroups = true;
                                break;
                            }
                        }

                        if (!inGroups) {
                            var sqlDelete = "DELETE FROM news_cansee WHERE id=?;";

                            connection.query(sqlDelete, [result.id], function () {
                                cb();
                            });
                        } else {
                            cb();
                        }
                    }, function () {
                        async.each(groups, function (group, cb) {
                            console.log(group);

                            var inGroups = false;

                            for (var index in results) {
                                if (group == results[index].groups_name) {
                                    inGroups = true;
                                    break;
                                }
                            }

                            if (!inGroups) {
                                var sqlAdd = "INSERT INTO news_cansee(news_id, group_name) VALUES(?, ?);";

                                connection.query(sqlAdd, [id, group], function () {
                                    cb();
                                });
                            } else {
                                cb();
                            }
                        }, function () {
                            return callback(true);
                        });
                    });
                } else {
                    return callback(true);
                }
            });
        } else {
            return callback(true);
        }
    });
}

function getAgendaItems(id, className, callback) {
    var sql = "SELECT *, DATE_FORMAT(creation_date, \"%Y-%c-%d-%H-%i\") AS creation_date, DATE_FORMAT(delivery_date, \"%Y-%c-%d-%H-%i\") AS delivery_date FROM agenda WHERE user_id=" + connection.escape(id) + " OR group_name=" + connection.escape(className) + ";";
    connection.query(sql, function (error, results) {
       if (!error) {
           return callback(results);
       } else {
           return callback();
       }
    });
}

function addAgendaItem(deliveryDate, period, type, user_id, title, description, groupName, callback) {
    var dateSplit = deliveryDate.split('-');
    var periodSplit = period.split(/[:-]/);

    var delivery = new Date(dateSplit[0], parseInt(dateSplit[1])-1, dateSplit[2], periodSplit[0], periodSplit[1]);

    var sql = "INSERT INTO agenda(creation_date, delivery_date, type, user_id, title, description, group_name) VALUES(NOW(), " + connection.escape(delivery) + ", " + connection.escape(type) + ", " + connection.escape(user_id) + ", " + connection.escape(title) + ", " + connection.escape(description) + ", " + connection.escape(groupName) + ");";
    connection.query(sql, function (error) {
        if (error) {
            return callback(false);
        } else {
            return callback(true);
        }
    });
}

function editAgendaItem(id, deliveryDate, period, type, title, description, groupName, callback) {
    var dateSplit = deliveryDate.split('-');
    var periodSplit = period.split(/[:-]/);

    var delivery = new Date(dateSplit[0], parseInt(dateSplit[1])-1, dateSplit[2], periodSplit[0], periodSplit[1]);

    var sql = "UPDATE agenda SET delivery_date=?, type=?, title=?, description=?, group_name=? WHERE id=?;";
    connection.query(sql, [delivery, type, title, description, groupName, id], function (error) {
        if (error) {
            return callback(false);
        } else {
            return callback(true);
        }
    });
}

function removeAgendaItem(id, user_id, callback) {
    var checkUserId = "SELECT * FROM agenda WHERE id=?;";
    connection.query(checkUserId, [id], function (error, results) {
        if (error == null) {
            if (results.length == 1) {
                if (results[0].user_id == user_id) {
                    var deleteSQL = "DELETE FROM agenda WHERE id=?;";
                    connection.query(deleteSQL, [id], function (error) {
                        if (error) {
                            return callback(false);
                        } else {
                            return callback(true);
                        }
                    });
                } else {
                    return callback(false);
                }
            } else {
                return callback(false);
            }
        } else {
           return callback(false);
        }
    });
}

function addSubjectNote(userid, title, description, path, public, callback) {
    var sql = "INSERT INTO subject_notes(user_id, title, description, public, path) VALUES(?, ?, ?, ?, ?)";
    connection.query(sql, [userid, title, description, public, path], function (error) {
        if (!error) {
            return callback(null);
        } else {
            return callback('ERROR');
        }
    });
}

function editSubjectNote(id, title, description, public, callback) {
    var sql = "UPDATE subject_notes SET title=?, description=?, public=? WHERE id=?;";
    connection.query(sql, [title, description, public, id], function (error, result) {
        if (!error) {
            return callback(null);
        } else {
            return callback('ERROR');
        }
    });
}

function getNote(note_id, callback) {
    var sql = "SELECT * FROM subject_notes WHERE id=?;";

    connection.query(sql, [note_id], function (error, results) {
       if (!error) {
           if (results.length == 1) {
              return callback(null, results[0]);
           }
       }

       callback('error');
    });
}

function deleteSubjectNote(id, callback) {
    var sql = "DELETE FROM subject_notes WHERE id=?;";
    connection.query(sql, [id], function () {
        callback();
    });
}

function getSubjectNote(userid, path, callback) {
    var sql = "SELECT * FROM subject_notes WHERE user_id=? AND path=?;";
    connection.query(sql, [userid, path], function (error, results) {
       if (!error) {
           if (results.length == 1) {
               var note = {};

               note['id'] = results[0].id;
               note['title'] = results[0].title;
               note['description'] = results[0].description;
               note['public'] = results[0].public;

               return callback(null, note);
           } else {
               return callback('ERROR');
           }
       } else {
           return callback('ERROR');
       }
    });
}

function getUserClassID(id, callback) {
    var sql = "SELECT * FROM user_class WHERE user_id=?;"
    connection.query(sql, [id], function (error, results) {
        if (!error) {
            if (results.length == 1) {
                return callback(null, results[0].class_id);
            }
        }

        callback('ERROR', null);
    });
}

function getUserClassName(id, callback) {
    getUserClassID(id, function (error, classId) {
        if (!error) {
            var sql = "SELECT * FROM classes WHERE id=?;";

            connection.query(sql, [classId], function (error, results) {
                if (!error) {
                    if (results.length == 1) {
                        return callback(null, results[0].name);
                    }
                }

                callback('ERROR');
            });
        } else {
            callback(null, '');
        }
    });
}

function getClassId(name, callback) {
    var sql = "SELECT * FROM classes WHERE name=?;";

    connection.query(sql, [name], function (error, results) {
       if (!error) {
           if (results.length == 1) {
               return callback(null, results[0].id);
           }
       }

       callback('ERROR', null);
    });
}

function classExists(className, callback) {
    var sql = "SELECT * FROM classes WHERE name=?;";

    connection.query(sql, [className], function (error, results) {
       if (!error) {
           if (!(results.length > 0)) {
               return callback(false);
           }
       }

       callback(true);
    });
}

function addClass(name, callback) {
    var sql = "INSERT INTO classes(name) VALUES(?);";
    
    connection.query(sql, [name], function (error, result) {
        return callback(error);
    });
}

function removeClass(id, callback) {
    var sql = "DELETE FROM classes WHERE id=?;";

    connection.query(sql, [id], function (error, result) {
        return callback(error);
    });
}

function removeClassByName(className, callback) {
    var sql = "DELETE FROM classes WHERE name=?;";

    connection.query(sql, [className], function (error, result) {
        return callback(error);
    });
}

function removeFromClass(className, callback) {
    getClassId(className, function (error, result) {
        if (!error) {
            var sql = "SELECT id FROM user_class WHERE class_id=?;";

            connection.query(sql, [result], function (error, results) {
               if (!error) {
                   async.each(results, function (result, cb) {
                       var deleteSQL = "DELETE FROM user_class WHERE id=?;";

                       connection.query(deleteSQL, [result.id], function (error) {
                           cb();
                       });
                   }, function (error) {
                       if (!error) {
                           callback(null);
                       } else {
                           callback('ERROR');
                       }
                   });
               } else {
                   callback('ERROR');
               }
            });
        } else {
            callback('ERROR');
        }
    });
}

function addUserToClass(username, class_name, callback) {
    getUserId(username, function (error, user_id) {
        if (!error) {
            editUserClass(user_id, class_name, function (error) {
               callback(error);
            });
        }
    });
}

function getClassId(class_name, callback) {
    var sql = "SELECT * FROM classes WHERE name=?;";

    connection.query(sql, [class_name], function (error, results) {
        if (!error) {
            if (results.length == 1) {
                return callback(null, results[0].id);
            }
        }

        callback('ERROR');
    });
}

function hasClass(user_id, callback) {
    var sql = "SELECT * FROM user_class WHERE user_id=?;";

    connection.query(sql, [user_id], function (error, results) {
        if (!error) {
            if (results.length == 1) {
                return callback(true);
            }
        }

        callback(false);
    });
}



function editUserClass(user_id, class_name, callback) {
    hasClass(user_id, function (result) {
        console.log('Has class ' + result);
        if (result) {
            if (class_name.length > 0) {
                getClassId(class_name, function (error, class_id) {
                    if (!error) {
                        var sql = "UPDATE user_class SET class_id=? WHERE user_id=?;";

                        connection.query(sql, [class_id, user_id], function (error) {
                            callback(error);
                        });
                    } else {
                        callback(error);
                    }
                });
            } else {
                var sql = "DELETE FROM user_class WHERE user_id=?;";

                connection.query(sql, [user_id], function (error) {
                    callback(error);
                });
            }
        } else {
            if (class_name.length > 0) {
                getClassId(class_name, function (error, class_id) {
                    if (!error) {
                        var sql = "INSERT INTO user_class(user_id, class_id) VALUES(?, ?);";

                        connection.query(sql, [user_id, class_id], function (error) {
                           callback(error);
                        });
                    } else {
                        callback(error);
                    }
                });
            } else {
                callback(null);
            }
        }
    });
}

function isUserInClass(user_id, callback) {
    var sql = "SELECT * FROM user_class WHERE user_id=?;";

    connection.query(sql, [user_id], function (error, results) {
        if (!error) {
            if (results.length == 0) {
                return callback(null, false);
            } else {
                return callback(null, true);
            }
        }

        callback('ERROR', null);
    });
}

function removeUserFromClass(userName, callback) {
    getUserId(userName, function (error, user_id) {
        if (!error) {
            var sql = "DELETE FROM user_class WHERE user_id=?;";

            connection.query(sql, [user_id], function (error, result) {
                if (!error) {
                    return callback(null, result);
                }

                callback('ERROR', null);
            });
        } else {
            callback('ERROR', null);
        }
    });
}

function getAllClasses(callback) {
    var sql = "SELECT * FROM classes;";

    connection.query(sql, function (error, results) {
        var list = [];

        for (var i = 0; i < results.length; i++) {
            list[list.length] = results[i].name;
        }

        callback(list);
    });
}

function changeVisability(visability, path, callback) {
    var searchSQL = "SELECT * FROM file_visability WHERE path=?;";

    connection.query(searchSQL, [path], function (error, results) {
       if (!error) {
           if (results.length == 0) {
               var createSQL = "INSERT INTO file_visability(visability, path) VALUES(?, ?);";

               connection.query(createSQL, [visability, path], function (error) {
                  callback(error);
               });
           } else {
               var changeSQL = "UPDATE file_visability SET visability=? WHERE path=?;";

               connection.query(changeSQL, [visability, path], function (error) {
                   callback(error);
               });
           }
       } else {
           callback('ERROR');
       }
    });
}

function getVisability(path, callback) {
    var sql = "SELECT * FROM file_visability WHERE path=?;";

    connection.query(sql, [path], function (error, results) {
        if (!error) {
            if (results.length == 1) {
                var object = {visability: results[0].visability == 1 ? true : false, path: results[0].path};

                callback(null, object);
            } else {
                callback(true);
            }
        } else {
            callback(true);
        }
    });
}

function deleteVisability(path, callback) {
    var sql = "DELETE FROM file_visability WHERE path=?;";

    connection.query(sql, [path], function (error) {
       callback(error);
    });
}

function addMailLocation(mail_id, user_id, location, callback) {
    var sql = "INSERT INTO mail_location(mail_id, user_id, location, old_location) VALUES(?, ?, ?, ?);";

    connection.query(sql, [mail_id, user_id, location, 0], function (error) {
        callback(error);
    });
}

function addMailOpened(mail_id, user_id, callback) {
    var sql = "INSERT INTO mail_opened(mail_id, user_id, opened) VALUES(?, ?, ?);";

    connection.query(sql, [mail_id, user_id, 0], function (error) {
        callback(error);
    });
}

var tempDirection = __dirname.replace("routes", "private/mails/temp");
var mailDirection = __dirname.replace("routes", "private/mails/mails");

function sendMail(user_id, to_ids, cc_ids, bcc_ids, title, body, callback) {
    var sqlMail = "INSERT INTO mails(from_id, title, body, date) VALUES(?, ?, ?, NOW());";
    connection.query(sqlMail, [user_id, title, body], function (error, result) {
        if (!error) {
            if (result.insertId != undefined) {
                async.series([
                    function (callb) {
                        var path = tempDirection + '/' + user_id;

                        if (fs.existsSync(path)) {
                            fs.readdir(path, function (error, files) {
                               if (!error) {
                                   if (files.length > 0) {
                                       var newPath = mailDirection + '/' + user_id;

                                       if (!fs.existsSync(newPath)) {
                                           fs.mkdirSync(newPath);
                                       }

                                       newPath += '/' + result.insertId;

                                       if (!fs.existsSync(newPath)) {
                                           fs.mkdirSync(newPath);
                                       }

                                       async.each(files, function (file, cb) {

                                           fs.rename(path + '/' + file, newPath + '/' + file, function (error) {
                                               cb(error);
                                           });
                                       }, function (error) {
                                           if (!error) {
                                               var sqlAttachment = "INSERT INTO mail_attachment(mail_id, path) VALUES(?, ?);";

                                               connection.query(sqlAttachment, [result.insertId, newPath], function (error) {

                                                   if (!error) {
                                                       callb(null);
                                                   } else {
                                                       callb('error');
                                                   }
                                               });
                                           } else {
                                               callb('error');
                                           }
                                       });
                                   } else {
                                       callb(null);
                                   }
                               } else {
                                   callb('error');
                               }
                            });
                        } else {
                            callb(null);
                        }
                    },

                    function (c) {
                        addMailLocation(result.insertId, user_id, 'SENT', function (error) {
                            if (!error) {
                                async.each(to_ids, function (to_id, cb) {
                                    var sqlTO = "INSERT INTO mail_to(mail_id, to_id) VALUES(?, ?);";
                                    connection.query(sqlTO, [result.insertId, to_id], function (error) {
                                        if (!error) {
                                            addMailLocation(result.insertId, to_id, 'INBOX', function (error) {
                                                if (!error) {
                                                    addMailOpened(result.insertId, to_id, function (error) {
                                                        cb(error);
                                                    });
                                                } else {
                                                    cb(error);
                                                }
                                            });
                                        } else {
                                            cb(error);
                                        }
                                    });
                                }, function (error) {
                                    if (!error) {
                                        async.each(cc_ids, function (cc_id, cb) {
                                            var sqlCC = "INSERT INTO mail_cc(mail_id, cc_id) VALUES(?, ?);";
                                            connection.query(sqlCC, [result.insertId, cc_id], function (error) {
                                                if (!error) {
                                                    addMailLocation(result.insertId, cc_id, 'INBOX', function (error) {
                                                        if (!error) {
                                                            addMailOpened(result.insertId, cc_id, function (error) {
                                                                cb(error);
                                                            });
                                                        } else {
                                                            cb(error);
                                                        }
                                                    })
                                                } else {
                                                    cb(error);
                                                }
                                            });
                                        }, function (error) {
                                            if (!error) {
                                                async.each(bcc_ids, function (bcc_id, cb) {
                                                    var sqlBCC = "INSERT INTO mail_bcc(mail_id, bcc_id) VALUES(?, ?);";
                                                    connection.query(sqlBCC, [result.insertId, bcc_id], function (error) {
                                                        if (!error) {
                                                            addMailLocation(result.insertId, bcc_id, 'INBOX', function (error) {
                                                                if (!error) {
                                                                    addMailOpened(result.insertId, bcc_id, function (error) {
                                                                        cb(error);
                                                                    });
                                                                } else {
                                                                    cb(error);
                                                                }
                                                            })
                                                        } else {
                                                            cb(error);
                                                        }
                                                    });
                                                }, function (error) {
                                                    if (!error) {
                                                        c(null);
                                                    }
                                                });
                                            } else {
                                                c(error);
                                            }
                                        });
                                    } else {
                                        c(error);
                                    }
                                });
                            } else {
                                c(error);
                            }
                        });
                    }
                ], function (error) {
                    if (!error) {
                        callback(null);
                    } else {
                        callback(error);
                    }
                });
            } else {
                callback(error);
            }
        } else {
            callback(error);
        }
    });
}

function getMailFrom(mail_id, callback) {
    var sql = "SELECT * FROM mails WHERE id=?;";

    connection.query(sql, [mail_id], function (error, results) {
        if (!error) {
            if (results.length == 1) {
                return callback(null, results[0].from_id);
            }
        }

        callback('error');
    })
}

function getMails(callback) {
    var sql = "SELECT * FROM mails;";

    connection.query(sql, function (error, results) {
        if (!error) {
            var mails = [];

            async.each(results, function (result, cb) {
                var mailObject = {id: result.id, from_id: result.from_id, title: result.title, body: result.body, date: result.date};
                mails[mails.length] = mailObject;

                cb();
            }, function () {
                callback(mails);
            });
        }
    });
}

function isMailOpened(mail_id, user_id, callback) {
    var sql = "SELECT * FROM mail_opened WHERE mail_id=? AND user_id=?;";

    connection.query(sql, [mail_id, user_id], function (error, result) {
       if (!error) {
           if (result.length > 0) {
               return callback(null, result[0].opened == 1 ? true : false);
           } else {
               return callback(null, true);
           }
       }

       callback(error);
    });
}

function inLocation(mail_id, user_id, location, callback) {
    var sql = "SELECT * FROM mail_location WHERE mail_id=? AND user_id=? AND location=?;";

    connection.query(sql, [mail_id, user_id, location], function (error, results) {
       if (!error) {
           if (results.length > 0) {
               return callback(null, results);
           }
       }

       callback(true);
    });
}

function openMail(mail_id, user_id, callback) {
    var sql = "SELECT * FROM mail_location WHERE mail_id=? AND user_id=?;";

    connection.query(sql, [mail_id, user_id], function (error, results) {
        if (!error) {
            if (results.length > 0) {
                if (results[0].location != 'CONCEPT') {
                    var openSQL = "UPDATE mail_opened SET opened=? WHERE mail_id=? AND user_id=?;";

                    connection.query(openSQL, [1, mail_id, user_id], function (error) {
                        return callback(error);
                    });
                } else {
                    callback('ERROR');
                }
            } else {
                callback('ERROR');
            }
        } else {
            callback(error);
        }
    });
}

function changeLocation(mail_id, user_id, oldLocation, location, callback) {
    var sql = "UPDATE mail_location SET location=?, old_location=? WHERE mail_id=? AND user_id=? AND location=?;";

    connection.query(sql, [location, oldLocation, mail_id, user_id, oldLocation], function (error) {
        callback(error);
    });
}

function mailInfo(mail_id, user_id, callback) {
    async.series([
        function (cb) {
            var sql = "SELECT * FROM mail_to WHERE mail_id=?;";

            connection.query(sql, [mail_id], function (error, results) {
                if (!error) {
                    var to_list = [];

                    for (var index in results) {
                        var result = results[index];

                        to_list[to_list.length] = result.to_id;
                    }

                    cb(null, to_list);
                } else {
                    cb(error);
                }
            });
        },

        function (cb) {
            var sql = "SELECT * FROM mail_cc WHERE mail_id=?;";

            connection.query(sql, [mail_id], function (error, results) {
                if (!error) {
                    var cc_list = [];

                    for (var index in results) {
                        var result = results[index];

                        cc_list[cc_list.length] = result.cc_id;
                    }

                    cb(null, cc_list);
                } else {
                    cb(error);
                }
            });
        },

        function (cb) {
            var sql = "SELECT * FROM mail_bcc WHERE mail_id=?;";

            connection.query(sql, [mail_id], function (error, results) {
                if (!error) {
                    var bcc_list = [];

                    for (var index in results) {
                        var result = results[index];

                        bcc_list[bcc_list.length] = result.bcc_id;
                    }

                    cb(null, bcc_list);
                } else {
                    cb(error);
                }
            });
        },

        function (cb) {
            var sql = "SELECT from_id FROM mails WHERE id=?;";

            connection.query(sql, [mail_id], function (error, result) {
                if (!error) {
                    cb(null, result[0].from_id);
                } else {
                    cb(null);
                }
            });
        }
    ], function (error, results) {
        if (!error) {
            var creator = false;
            if (results[3] != undefined) {
                if (results[3] == user_id) {
                    creator = true;
                }
            }

            var contains = false;
            var place = -1;

            for (var a in results) {
                for (var b in results[a]) {
                    if (user_id == results[a][b]) {
                        place = a;
                        contains = true;
                    }
                }
            }

            if (contains) {
                var object = {};

                if (place == 2) {
                    getUsername(user_id, function (error, username) {
                       if (!error) {
                           object['bcc'] = username;

                           return callback(null, object);
                       } else {
                           callback(error);
                       }
                    });
                } else {
                    async.series([
                        function (callb) {
                            var list = [];

                            async.each(results[0], function (id, cb) {
                                getUsername(id, function (error, username) {
                                   if (!error) {
                                       list[list.length] = username;
                                   }

                                   cb();
                                });
                            }, function () {
                                callb(null, list)
                            });
                        },

                        function (callb) {
                            var list = [];

                            async.each(results[1], function (id, cb) {
                                getUsername(id, function (error, username) {
                                    if (!error) {
                                        list[list.length] = username;
                                    }

                                    cb();
                                });
                            }, function () {
                                callb(null, list)
                            });
                        },

                        function (callb) {
                            var list = [];

                            async.each(results[2], function (id, cb) {
                                getUsername(id, function (error, username) {
                                    if (!error) {
                                        list[list.length] = username;
                                    }

                                    cb();
                                });
                            }, function () {
                                callb(null, list)
                            });
                        }
                    ], function (error, res) {
                        if (!error) {
                            object['to'] = res[0];
                            object['cc'] = res[1];

                            if (creator) {
                                object['bcc'] = res[2];
                            }

                            return callback(null, object);
                        } else {
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null, {});
            }
        } else {
            callback('ERROR');
        }
    });
}

function addConcept(user_id, to_ids, cc_ids, bcc_ids, title, body, callback) {
    var sqlMail = "INSERT INTO mails(from_id, title, body, date) VALUES(?, ?, ?, NOW());";
    connection.query(sqlMail, [user_id, title, body], function (error, result) {
        if (!error) {
            if (result.insertId != undefined) {
                async.series([
                    function (callb) {
                        var path = tempDirection + '/' + user_id;

                        if (fs.existsSync(path)) {
                            fs.readdir(path, function (error, files) {
                                if (!error) {
                                    if (files.length > 0) {
                                        var newPath = mailDirection + '/' + user_id;

                                        if (!fs.existsSync(newPath)) {
                                            fs.mkdirSync(newPath);
                                        }

                                        newPath += '/' + result.insertId;

                                        if (!fs.existsSync(newPath)) {
                                            fs.mkdirSync(newPath);
                                        }

                                        async.each(files, function (file, cb) {

                                            fs.rename(path + '/' + file, newPath + '/' + file, function (error) {
                                                cb(error);
                                            });
                                        }, function (error) {
                                            if (!error) {
                                                var sqlAttachment = "INSERT INTO mail_attachment(mail_id, path) VALUES(?, ?);";
                                                connection.query(sqlAttachment, [result.insertId, newPath], function (error) {

                                                    if (!error) {
                                                        callb(null);
                                                    } else {
                                                        callb('error');
                                                    }
                                                });
                                            } else {
                                                callb('error');
                                            }
                                        });
                                    } else {
                                        callb(null);
                                    }
                                } else {
                                    callb('error');
                                }
                            });
                        } else {
                            callb(null);
                        }
                    },

                    function (callb) {
                        addMailLocation(result.insertId, user_id, 'CONCEPT', function (error) {
                            if (!error) {
                                async.each(to_ids, function (to_id, cb) {
                                    var sqlTO = "INSERT INTO mail_to(mail_id, to_id) VALUES(?, ?);";
                                    connection.query(sqlTO, [result.insertId, to_id], function (error) {
                                        cb(error);
                                    });
                                }, function (error) {
                                    if (!error) {
                                        async.each(cc_ids, function (cc_id, cb) {
                                            var sqlCC = "INSERT INTO mail_cc(mail_id, cc_id) VALUES(?, ?);";
                                            connection.query(sqlCC, [result.insertId, cc_id], function (error) {
                                                cb(error);
                                            });
                                        }, function (error) {
                                            if (!error) {
                                                async.each(bcc_ids, function (bcc_id, cb) {
                                                    var sqlBCC = "INSERT INTO mail_bcc(mail_id, bcc_id) VALUES(?, ?);";
                                                    connection.query(sqlBCC, [result.insertId, bcc_id], function (error) {
                                                        cb(error);
                                                    });
                                                }, function (error) {
                                                    if (!error) {
                                                        callb(null);
                                                    }
                                                });
                                            } else {
                                                callb(error);
                                            }
                                        });
                                    } else {
                                        callb(error);
                                    }
                                });
                            } else {
                                callb(error);
                            }
                        });
                    }
                ], function (error) {
                    console.log(error);

                    if (!error) {
                        callback(null);
                    } else {
                        callback(error);
                    }
                });
            } else {
                callback(error);
            }
        } else {
            callback(error);
        }
    });
}

function addOrRemoveReceivers(table, mail_id, column, receiver_ids, callback) {
    var sqlReceiver = "SELECT * FROM " + table + " WHERE mail_id=?;";

    connection.query(sqlReceiver, [mail_id], function (error, results) {
        if (!error) {
            async.each(receiver_ids, function (receiver_id, cb) {
                var contains = false;

                if (results.length > 0) {
                    for (var index in results) {
                        var object = results[index];

                        if (receiver_id == object[column]) {
                            contains = true;
                            break;
                        }
                    }
                }

                if (!contains) {
                    var sqlAdd = "INSERT INTO " + table + "(mail_id, " + column + ") VALUES(?, ?);";

                    connection.query(sqlAdd, [mail_id, receiver_id], function (error) {
                        cb();
                    });
                } else {
                    cb();
                }
            }, function () {
                if (results.length > 0) {
                    async.each(results, function (result, cb) {
                        var contains = false;

                        for (var index in receiver_ids) {
                            var id = receiver_ids[index];

                            if (id == result[column]) {
                                contains = true;
                                break;
                            }
                        }

                        if (!contains) {
                            var sqlDelete = "DELETE FROM " + table + " WHERE id=?;";

                            connection.query(sqlDelete, [result.id], function () {
                                cb();
                            });
                        } else {
                            cb();
                        }
                    }, function () {
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            });
        } else {
            callback('ERROR');
        }
    });
}

function updateConcept(mail_id, user_id, to_ids, cc_ids, bcc_ids, title, body, callback) {
    var sqlMail = "SELECT * FROM mails WHERE id=? AND from_id=?;";
    connection.query(sqlMail, [mail_id, user_id], function (error, results) {
        if (!error) {
            if (results.length > 0) {
                var updateMailSQL = "UPDATE mails SET title=?, body=?, date=NOW() WHERE id=?;";

                connection.query(updateMailSQL, [title, body, mail_id], function (error) {
                    if (!error) {
                        addOrRemoveReceivers('mail_to', mail_id, 'to_id', to_ids, function (error) {
                           if (!error) {
                               addOrRemoveReceivers('mail_cc', mail_id, 'cc_id', cc_ids, function (error) {
                                   if (!error) {
                                       addOrRemoveReceivers('mail_bcc', mail_id, 'bcc_id', bcc_ids, function (error) {
                                           callback(error);
                                       });
                                   } else {
                                       callback(error);
                                   }
                               });
                           } else {
                               callback(error);
                           }
                        });
                    } else {
                        callback(error);
                    }
                });
            } else {
                callback('ERROR');
            }
        } else {
            callback(error);
        }
    });
}

function sendConcept(mail_id, user_id, to_ids, cc_ids, bcc_ids, title, body, callback) {
    updateConcept(mail_id, user_id, to_ids, cc_ids, bcc_ids, title, body, function (error) {
        if (!error) {
            var sqlLocation = "UPDATE mail_location SET location=? WHERE mail_id=? AND user_id=?;";

            connection.query(sqlLocation, ['SENT', mail_id, user_id], function (error) {
               if (!error) {
                   async.each(to_ids, function (to_id, cb) {
                       addMailLocation(mail_id, to_id, 'INBOX', function (error) {
                           if (!error) {
                               addMailOpened(mail_id, to_id, function (error) {
                                   cb(error);
                               });
                           } else {
                               cb(error);
                           }
                       });
                   }, function (error) {
                       if (!error) {
                           async.each(cc_ids, function (cc_id, cb) {
                               addMailLocation(mail_id, cc_id, 'INBOX', function (error) {
                                   if (!error) {
                                       addMailOpened(mail_id, cc_id, function (error) {
                                           cb(error);
                                       });
                                   } else {
                                       cb(error);
                                   }
                               });
                           }, function (error) {
                               if (!error) {
                                   async.each(bcc_ids, function (bcc_id, cb) {
                                       addMailLocation(mail_id, bcc_id, 'INBOX', function (error) {
                                           if (!error) {
                                               addMailOpened(mail_id, bcc_id, function (error) {
                                                   cb(error);
                                               });
                                           } else {
                                               cb(error);
                                           }
                                       });
                                   }, function (error) {
                                       if (!error) {
                                            callback(null);
                                       } else {
                                           callback(error);
                                       }
                                   });
                               } else {
                                   callback(error);
                               }
                           });
                       } else {
                           callback(error);
                       }
                   });
               } else {
                   callback(error);
               }
            });
        } else {
            callback(error);
        }
    });
}

function deleteMail(mail_id, user_id, callback) {
    var sql = "SELECT * FROM mail_location WHERE mail_id=? AND user_id=? AND location=?;";

    connection.query(sql, [mail_id, user_id, 'TRASH'], function (error, results) {
       if (!error) {
           if (results.length == 1) {
               var sqlDelete = "DELETE FROM mail_location WHERE mail_id=? AND user_id=? AND location=?;";

               connection.query(sqlDelete, [mail_id, user_id, 'TRASH'], function (error) {
                   return callback(error);
               });
           } else {
               callback('ERROR');
           }
       } else {
           callback(error);
       }
    });
}

function getAttachmentPath(mail_id, callback) {
    var sql = "SELECT * FROM mail_attachment WHERE mail_id=?;";

    connection.query(sql, [mail_id], function (error, results) {
        if (!error) {
            if (results.length == 1) {
                return callback(null, results[0].path);
            }
        }

        callback('error');
    });
}

function addAttachment(mail_id, path, callback) {
    var sql = "INSERT INTO mail_attachment(mail_id, path) VALUES(?, ?);";

    connection.query(sql, [mail_id, path], function (error) {
        callback(error);
    });
}

function hasAttachment(mail_id, callback) {
    var sql = "SELECT * FROM mail_attachment WHERE mail_id=?;";

    connection.query(sql, [mail_id], function (error, results) {
        if (!error) {
            return callback(null, results.length == 1 ? true : false);
        }

        callback('error');
    });
}

function getOpenedMails(user_id, opened, callback) {
    var sql = "SELECT * FROM mail_opened WHERE user_id=? AND opened=?;";

    connection.query(sql, [user_id, opened], function (error, results) {
        if (!error) {
            return callback(null, results.length);
        }

        callback(error);
    });
}

function getUserInformation(username, callback) {
    getUserId(username, function (error, user_id) {
        if (!error) {
            async.series([
                function (cb) {
                    getUserClassName(user_id, function (error, class_name) {
                        if (!error) {
                            cb(null, class_name);
                        } else {
                            cb(error);
                        }
                    });
                }, function (cb) {
                    getGroup(user_id, function (groups) {
                       cb(null, groups);
                    });
                }
            ], function (error, results) {
                if (!error) {
                    callback({class: results[0], groups: results[1]});
                } else {
                    callback({});
                }
            });
        } else {
            callback({});
        }
    });
}

function defaultDatabase() {
    var userTable = "CREATE TABLE IF NOT EXISTS users(id INT NOT NULL AUTO_INCREMENT, username VARCHAR(30) NOT NULL, password VARCHAR(60) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(userTable);

    var userInfoTable = "CREATE TABLE IF NOT EXISTS user_info(id INT NOT NULL, user_id INT NOT NULL, birthday DATE, full_name VARCHAR(100), photo_path_id VARCHAR(60), PRIMARY KEY (`id`));";
    connection.query(userInfoTable);

    var userPermission = "CREATE TABLE IF NOT EXISTS permission(id INT NOT NULL AUTO_INCREMENT, user_id INT NOT NULL, group_name VARCHAR(30) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(userPermission);

    var defaultAdmin = "INSERT INTO users(username, password) SELECT 'admin', '$2a$10$s7AAUgd6kZvNXqaVY.ygu.4CpdnnbCgDr1Q2/m9WFrF0FtNydsT.K' FROM dual WHERE NOT EXISTS (SELECT username FROM users WHERE username='admin');";
    connection.query(defaultAdmin);

    var defaultAdminInfo = "INSERT INTO user_info(user_id, birthday, full_name, photo_path_id) SELECT 1, NOW(), 'Scooly admin', ? FROM dual WHERE NOT EXISTS (SELECT user_id FROM user_info WHERE user_id=1 AND full_name='Scooly admin');";
    connection.query(defaultAdminInfo, "$2a$10$8B07JO5BHz5Lci6ScTPeQe4gv9QyciGwkgcmD8tFazu1nrBK8C4vu");

    var defaultAdminPermission = "INSERT INTO permission(user_id, group_name) SELECT 1, 'admin' FROM dual WHERE NOT EXISTS (SELECT user_id FROM permission WHERE user_id=1);";
    connection.query(defaultAdminPermission);

    var newsTable = "CREATE TABLE IF NOT EXISTS news(id INT NOT NULL AUTO_INCREMENT, title VARCHAR(30) NOT NULL, description TEXT NOT NULL, date DATETIME NOT NULL, PRIMARY KEY (`id`));"
    connection.query(newsTable);

    var newsCanSeeTable = "CREATE TABLE IF NOT EXISTS news_cansee(id INT NOT NULL AUTO_INCREMENT, news_id INT NOT NULL, group_name VARCHAR(30) NOT NULL, PRIMARY KEY (`id`));"
    connection.query(newsCanSeeTable);

    var defaultNews = "INSERT INTO news(title, description, date) SELECT 'Scooly', 'A new school platform that can make everything possible. It contains lots of cool features.', NOW() FROM dual WHERE NOT EXISTS (SELECT title FROM news WHERE title='Scooly');";
    connection.query(defaultNews);

    //Mail
    var mailTable = "CREATE TABLE IF NOT EXISTS mails(id INT NOT NULL AUTO_INCREMENT, from_id INT NOT NULL, title VARCHAR(100), body TEXT, date DATETIME NOT NULL, PRIMARY KEY (`id`));"
    connection.query(mailTable);

    var mailToTable = "CREATE TABLE IF NOT EXISTS mail_to(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, to_id INT NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailToTable);

    var mailLocationTable = "CREATE TABLE IF NOT EXISTS mail_location(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, user_id INT NOT NULL, location VARCHAR(50) NOT NULL, old_location VARCHAR(50) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailLocationTable);

    var mailCCTable = "CREATE TABLE IF NOT EXISTS mail_cc(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, cc_id INT NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailCCTable);

    var mailBCCTable = "CREATE TABLE IF NOT EXISTS mail_bcc(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, bcc_id INT NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailBCCTable);

    var mailAttachmentTable = "CREATE TABLE IF NOT EXISTS mail_attachment(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, path VARCHAR(252) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailAttachmentTable);

    var mailOpenedTable = "CREATE TABLE IF NOT EXISTS mail_opened(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, user_id INT NOT NULL, opened INT(1) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailOpenedTable);

    var classTable = "CREATE TABLE IF NOT EXISTS classes(id INT NOT NULL AUTO_INCREMENT, name VARCHAR(30) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(classTable);

    var userClassTable = "CREATE TABLE IF NOT EXISTS user_class(id INT NOT NULL AUTO_INCREMENT, user_id INT NOT NULL, class_id INT NOT NULL, PRIMARY KEY (`id`));";
    connection.query(userClassTable);

    var agendaTable = "CREATE TABLE IF NOT EXISTS agenda(id INT NOT NULL AUTO_INCREMENT, creation_date DATETIME NOT NULL, delivery_date DATETIME NOT NULL, type INT(1) NOT NULL, user_id INT NOT NULL, title VARCHAR(30) NOT NULL, description TEXT, group_name VARCHAR(30), PRIMARY KEY (`id`));";
    connection.query(agendaTable);

    var subjectTable = "CREATE TABLE IF NOT EXISTS subject_notes(id INT NOT NULL AUTO_INCREMENT, user_id INT NOT NULL, title VARCHAR(30), description TEXT, public INT NOT NULL, path VARCHAR(252) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(subjectTable);

    var fileVisabilityTable = "CREATE TABLE IF NOT EXISTS file_visability(id INT NOT NULL AUTO_INCREMENT, visability INT(1) NOT NULL, path VARCHAR(252) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(fileVisabilityTable);
}

exports.connection = connection;
exports.connect = connect;
exports.defaultDatabase = defaultDatabase;
exports.getUsername = getUsername;
exports.getUserId = getUserId;
exports.deleteUser = deleteUser;
exports.getPassword = getPassword;
exports.getUserProfilePic = getUserProfilePic;
exports.changePassword = changePassword;
exports.getGroup = getGroup;
exports.addUser = addUser;
exports.removeUser = removeUser;
exports.changeUserGroup = changeUserGroup;
exports.getConnection = getConnection;
exports.login = login;
exports.addNewsArticle = addNewsArticle;
exports.removeNewsArticle = removeNewsArticle;
exports.updateNewsArticle = updateNewsArticle;
exports.getAgendaItems = getAgendaItems;
exports.addAgendaItem = addAgendaItem;
exports.addSubjectNote = addSubjectNote;
exports.editSubjectNote = editSubjectNote;
exports.deleteSubjectNote = deleteSubjectNote;
exports.getSubjectNote = getSubjectNote;
exports.editAgendaItem = editAgendaItem;
exports.removeAgendaItem = removeAgendaItem;
exports.getUserClassID = getUserClassID;
exports.getUserClassName = getUserClassName;
exports.getClassId = getClassId;
exports.classExists = classExists;
exports.addClass = addClass;
exports.removeClass = removeClass;
exports.addUserToClass = addUserToClass;
exports.removeUserFromClass = removeUserFromClass;
exports.getAllClasses = getAllClasses;
exports.removeClassByName = removeClassByName;
exports.removeFromClass = removeFromClass;
exports.changeVisability = changeVisability;
exports.getVisability = getVisability;
exports.deleteVisability = deleteVisability;
exports.getNote = getNote;
exports.sendMail = sendMail;
exports.addConcept = addConcept;
exports.updateConcept = updateConcept;
exports.getMails = getMails;
exports.isMailOpened = isMailOpened;
exports.inLocation = inLocation;
exports.openMail = openMail;
exports.changeLocation = changeLocation;
exports.getUsers = getUsers;
exports.getMailFrom = getMailFrom;
exports.mailInfo = mailInfo;
exports.deleteMail = deleteMail;
exports.hasAttachment = hasAttachment;
exports.getAttachmentPath = getAttachmentPath;
exports.addAttachment = addAttachment;
exports.sendConcept = sendConcept;
exports.getOpenedMails = getOpenedMails;
exports.getUserInformation = getUserInformation;
exports.addGroup = addGroup;
exports.removeGroup = removeGroup;



