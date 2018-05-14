var express = require('express');
var router = express.Router();
var database = require('./database');
var fs = require('fs');
var AdmZip = require('adm-zip');
var async = require('async');

var direction = __dirname.replace("routes", "private/mails/temp");
var mailDirection = __dirname.replace("routes", "private/mails/mails");
var zipsDirection = __dirname.replace("routes", "private/zips");

router.get('/remove/:name', function(req, res) {
    if (req.session && req.session.user_id) {
        var name = decodeURIComponent(req.params.name);

        if (fs.existsSync(direction + '/' + req.session.user_id + '/' + name)) {
            fs.unlink(direction + '/' + req.session.user_id + '/' + name, function(error) {
                res.end('success');
            });
        } else {
            res.end('error');
        }
    }
});

function containsUser(mail_id, from_id, user_id, callback) {
    if (from_id == user_id) {
        callback(null, true);
    } else {
        database.mailInfo(mail_id, user_id, function (error, results) {
            if (!error) {
                database.getUsername(user_id, function (error, username) {
                    if (!error) {
                        var contains = false;

                        for (var key in results) {
                            for (var index in results[key]) {
                                if (results[key][index] == username) {
                                    contains = true;
                                    break;
                                }
                            }
                        }

                        callback(null, contains);
                    } else {
                        callback(error);
                    }
                });
            } else {
                callback(error);
            }
        });
    }
}

router.get('/download/:mail_id', function(req, res) {
    if (req.session && req.session.user_id) {
        database.getMailFrom(req.params.mail_id, function (error, user_id) {
            if (!error) {
                containsUser(req.params.mail_id, user_id, req.session.user_id, function (error, idContributor) {
                    if (!error) {
                        if (idContributor) {
                            database.getAttachmentPath(req.params.mail_id, function (error, path) {
                                if (!error) {
                                    fs.readdir(path, function (error, files) {
                                        var zip = new AdmZip();

                                        for (var index in files) {
                                            zip.addLocalFile(path += '/' + files[index]);
                                        }

                                        zip.writeZip(zipsDirection + '/' + req.params.mail_id + '.zip');
                                        res.download(zipsDirection + '/' + req.params.mail_id + '.zip');
                                    });
                                } else {
                                    res.end();
                                }
                            });
                        } else {
                            res.end();
                        }
                    } else {
                        res.end();
                    }
                });
            } else {
                res.end();
            }
        });
    }
});

router.get('/clear', function(req, res) {
    if (req.session && req.session.user_id) {
        var path = direction + '/' + req.session.user_id;

        if (fs.existsSync(path)) {
            fs.readdir(path, function (error, files) {
                if (!error) {
                    async.each(files, function (file, cb) {
                        fs.unlink(path + '/' + file, function (error) {
                            cb();
                        });
                    }, function () {
                        res.end();
                    });
                } else {
                    res.end();
                }
            });
        } else {
            res.end();
        }
    }
});


router.get('/concept/:mail_id', function(req, res) {
    if (req.session && req.session.user_id) {
        database.getMailFrom(req.params.mail_id, function (error, from_id) {
           if (!error) {
               if (from_id == req.session.user_id) {
                   var path = mailDirection + '/' + from_id + '/' + req.params.mail_id;

                   if (fs.existsSync(path)) {
                       fs.readdir(path, function (error, files) {
                           if (!error) {
                               var newDir = direction + '/' + from_id;
                               var list = [];

                               if (!fs.existsSync(newDir)) {
                                   fs.mkdirSync(newDir);
                               }

                               async.each(files, function (file, cb) {
                                   fs.rename(path + '/' + file, newDir + '/' + file, function (error) {
                                       if (!error) {
                                           list[list.length] = file;
                                       }

                                       cb();
                                   });
                               }, function () {
                                   res.setHeader('Content-type', 'application/json');
                                   res.send(list);
                               });
                           } else {
                               res.end();
                           }
                       });
                   } else {
                       res.end();
                   }
               } else {
                   res.end();
               }
           } else {
               res.end();
           }
        });
    }
});

router.post('/', function(req, res) {
    if (req.session && req.session.user_id) {
        var list = [];

        if (!Array.isArray(req.files.uploads)) {
            list[list.length] = req.files.uploads;
        } else {
            list = req.files.uploads;
        }

        if (!fs.existsSync(direction + '/' + req.session.user_id)) {
            fs.mkdirSync(direction + '/' + req.session.user_id);
        }

        async.each(list, function (file, cb) {
            file.mv(direction + '/' + req.session.user_id + '/' + file.name, function(err) {
                cb(err);
            });
        }, function (error) {
            var files = [];

            for (var index in list) {
                files[files.length] = list[index].name;
            }

            res.setHeader('Content-type', 'application/json');
            res.send(files);
        });
    }
});

module.exports = router;