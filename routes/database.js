var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var async = require('async');

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
            } else {
                return callback('ERROR');
            }
        } else {
            return callback('ERROR');
        }
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
            if (rows != undefined) {
                if (rows.length == 1) {
                    callback(rows[0].group_name);
                }
            }
        } else {
            callback('');
        }
    })
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

        return callback(true);
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
                                            }
                                        });
                                    }
                                });
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

function getAllUserInformation(callback) {
    var usersObject = [];

    var sql = "SELECT id, username FROM users;";
    connection.query(sql, function (error, rows) {
        if (!error) {
            async.each(rows, function (userObject, callback) {
                async.series([
                    function (callback) {
                        getUserClassName(userObject.id, function (error, className) {
                            if (!error) {
                                if (className.length > 0) {
                                    userObject['class'] = className;
                                }
                            }

                            callback(null);
                        });
                    },

                    function (callback) {
                        getGroup(userObject.id, function (groupName) {
                            if (groupName.length > 0) {
                                userObject['group'] = groupName;
                                delete userObject['id'];

                                usersObject[usersObject.length] = userObject;
                                callback(null);
                            } else {
                                delete userObject['id'];

                                usersObject[usersObject.length] = userObject;
                                callback(null);
                            }
                        });
                    }
                ], function (error) {
                    callback();
                });
            }, function (err) {
                callback(usersObject);
            })
        }
    });
}

function changeUserGroup(username, group) {
    getUserId(username, function (error, id) {
        if (!error) {
            getGroup(id, function (groupName) {
                var sql;
                if (groupName.length > 0) {
                    sql = "UPDATE permission SET group_name='" + group + "' WHERE user_id=" + id + ";";
                } else {
                    sql = "INSERT INTO permission(user_id, group_name) VALUES(" + id + ", '" + group + "');";
                }

                connection.query(sql, function (error, result) {
                    if (!error) {
                        return;
                    }
                });
            });
        }
    });
}

function setOpenedMail(id) {
    var sql = "UPDATE mail SET opened=1 WHERE id=" + id + ";";
    connection.query(sql, function (error, result) {
        if (error) {
            console.log('Could not set the mail(' + id + ') to opened');
        }
    })
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

function addNewsArticle(title, description, callback) {
    var sql = "INSERT INTO news(title, description, date) VALUES(" + connection.escape(title) + ", " + connection.escape(description) + ", NOW());";
    connection.query(sql, function (error) {
        if (error) {
            return callback(false);
        } else {
            return callback(true);
        }
    });
}

function removeNewsArticle(id, callback) {
    var sql = "DELETE FROM news WHERE id=" + id + ";";
    connection.query(sql, function (error) {
        if (error) {
            return callback(false);
        } else {
            return callback(true);
        }
    });
}

function updateNewsArticle(id, title, description, callback) {
    var sql = "UPDATE news SET title=" + connection.escape(title) + ", description=" + connection.escape(description) + " WHERE id=" + id + ";";
    connection.query(sql, function (error, result) {
        if (error) {
            return callback(false);
        } else {
            return callback(true);
        }
    });
}

function getAgendaItems(id, groupName, callback) {
    var sql = "SELECT *, DATE_FORMAT(creation_date, \"%Y-%c-%d-%H-%i\") AS creation_date, DATE_FORMAT(delivery_date, \"%Y-%c-%d-%H-%i\") AS delivery_date FROM agenda WHERE user_id=" + connection.escape(id) + " OR group_name=" + connection.escape(groupName) + ";";
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

function getMailAdress(id, callback) {
    var sql = "SELECT address FROM mail WHERE user_id=" + connection.escape(id) + ";";
    connection.query(sql, function (error, results) {
        if (!error) {
            if (results.length == 1) {
                return callback(results[0].address);
            }
        }

        return callback();
    });
}

function addMailAddress(id, password, address, callback) {
    var sql = "SELECT * FROM mail WHERE user_id=" + id + ";";
    connection.query(sql, function (error, results) {
        if (!error) {
            if (results == 0) {
                var insertSQL = "INSERT INTO mail(user_id, address) VALUES(" + id + ", " + connection.escape(address) + ");";
                connection.query(insertSQL, function (error) {
                    if (!error) {
                        var insertSQLMailServer = "INSERT INTO virtual_users(domain_id, password , email) VALUES('1', " + mailConnection.escape(password) + ", " + mailConnection.escape(address += '@scooly.eu') + ")";
                        mailConnection.query(insertSQLMailServer, function (error) {
                            if (!error) {
                                return callback(true);
                            }
                        });
                    }
                })
            }
        }

        return callback(false);
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

function deleteSubjectNote(id) {
    var sql = "DELETE FROM subject_notes WHERE id=?;";
    connection.query(sql, [id], function (error) {
        if (!error) {
            return callback(null);
        } else {
            return callback('ERROR');
        }
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
        var sql = "SELECT * FROM classes WHERE id=?;";

        connection.query(sql, [classId], function (error, results) {
            if (!error) {
                if (results.length == 1) {
                    return callback(null, results[0].name);
                }
            }

            callback('ERROR', null);
        });
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

function addUserToClass(user_id, class_id, callback) {
    var sql = "INSERT INTO user_class(user_id, class_id) VALUES(?, ?);";

    connection.query(sql, [user_id, class_id], function (error, result) {
       if (!error) {
           return callback(null, result);
       }

       callback('ERROR', null);
    });
}

function editUserClass(user_id, class_id, callback) {
    var sql = "UPDATE user_class SET class_id=? WHERE user_id=?;";

    connection.query(sql, [class_id, user_id], function (error, result) {
        if (!error) {
            return callback(null, result);
        }

        callback('ERROR', null);
    });
}

function isUserInClass(userName, callback) {
    getUserId(userName, function (error, user_id) {
        if (!error) {
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
        } else {
            callback('ERROR', null);
        }
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

function addToClass(changes, callback) {
    async.each(changes, function (object, cb) {
        var userName = Object.keys(object)[0];

        isUserInClass(userName, function (error, result) {
            if (!error) {
                if (object[userName].length > 0) {
                    getUserId(userName, function (error, user_id) {
                        if (!error) {
                            getClassId(object[userName], function (error, class_id) {
                                if (!error) {
                                    if (result) {
                                        editUserClass(user_id, class_id, function (error, result) {
                                            cb(error, result);
                                        });
                                    } else {
                                        addUserToClass(user_id, class_id, function (error, result) {
                                            cb(error, result);
                                        });
                                    }
                                } else {
                                    cb(true, null);
                                }
                            });
                        } else {
                            cb(true, null);
                        }
                    });
                } else {
                    removeUserFromClass(userName, function (error, result) {
                        cb(error, result);
                    });
                }
            } else {
                cb(true, null);
            }
        });
    }, function (error, result) {
        callback(error, result);
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

    var defaultNews = "INSERT INTO news(title, description, date) SELECT 'Scooly', 'A new school platform that can make everything possible. It contains lots of cool features.', NOW() FROM dual WHERE NOT EXISTS (SELECT title FROM news WHERE title='Scooly');";
    connection.query(defaultNews);

    //Mail
    var mailTable = "CREATE TABLE IF NOT EXISTS mails(id INT NOT NULL AUTO_INCREMENT, from_id INT NOT NULL, title VARCHAR(100), body TEXT, PRIMARY KEY (`id`));"
    connection.query(mailTable);

    var mailToTable = "CREATE TABLE IF NOT EXISTS mail_to(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, to_id INT NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailToTable);

    var mailCCTable = "CREATE TABLE IF NOT EXISTS mail_cc(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, cc_id INT NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailCCTable);

    var mailBCCTable = "CREATE TABLE IF NOT EXISTS mail_bcc(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, bcc_id INT NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailBCCTable);

    var mailAttachmentTable = "CREATE TABLE IF NOT EXISTS mail_attachment(id INT NOT NULL AUTO_INCREMENT, mail_id INT NOT NULL, path VARCHAR(252) NOT NULL, PRIMARY KEY (`id`));";
    connection.query(mailAttachmentTable);


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
exports.getPassword = getPassword;
exports.getUserProfilePic = getUserProfilePic;
exports.setOpenedMail = setOpenedMail;
exports.changePassword = changePassword;
exports.getGroup = getGroup;
exports.addUser = addUser;
exports.getAllUserInformation = getAllUserInformation;
exports.removeUser = removeUser;
exports.changeUserGroup = changeUserGroup;
exports.getConnection = getConnection;
exports.login = login;
exports.addNewsArticle = addNewsArticle;
exports.removeNewsArticle = removeNewsArticle;
exports.updateNewsArticle = updateNewsArticle;
exports.getAgendaItems = getAgendaItems;
exports.addAgendaItem = addAgendaItem;
exports.getMailAdress = getMailAdress;
exports.addMailAddress = addMailAddress;
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
exports.addToClass = addToClass;
exports.changeVisability = changeVisability;
exports.getVisability = getVisability;



