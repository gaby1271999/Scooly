var async = require('async');
var fs = require('fs');
var fse = fs = require('fs-extra');
var p = require('path');
var mainFolder = require(__dirname.replace('modules', '/utils/main_folder'));
var database = require(__dirname.replace('modules', 'database'));

var direction = p.join(mainFolder.mainFolder(), 'private/subjects');

function deleteContents(user_id, path, callback) {
    async.series([
        function (cb) {
            database.getSubjectNote(user_id, path, function (error, note) {
                if (!error) {
                    if (note) {
                        database.deleteSubjectNote(note.id, function () {
                            cb();
                        });
                    } else {
                        cb();
                    }
                } else {
                    cb();
                }
            });
        },
        function (cb) {
            database.deleteVisability(path, function (error) {
                cb();
            });
        },
        function (cb) {
            fse.remove(direction + '/' + path, function () {
                cb();
            });
        }
    ], function () {
        callback();
    });
}

function deleteFile(user_id, path, filename, callback) {
    var dir = user_id + '/' + path + '/' + filename;

    if (fs.existsSync(direction + '/' + dir)) {
        if (!fs.statSync(direction + '/' + dir).isDirectory()) {
            deleteContents(user_id, dir, function (error) {
               callback(error);
            });
        } else {
            clearFolder(user_id, dir, function (error) {
               if (!error) {
                   deleteContents(user_id, dir, function (error) {
                       callback(error);
                   });
               } else {
                   callback(error);
               }
            });
        }
    } else {
        callback('ERROR');
    }
}

function clearFolder(user_id, path, callback) {
    fs.readdir(direction + '/' + path, function (error, files) {
       if (!error) {
           if (files.length > 0) {
               async.each(files, function (file, cb) {
                   if (!fs.lstatSync(direction + '/' + path + '/' + file).isDirectory()) {
                       deleteContents(user_id, path + '/' + file, function (error) {
                           cb(error);
                       });
                   } else {
                       clearFolder(user_id, path + '/' + file, function (error) {
                           if (!error) {
                               deleteContents(user_id, path + '/' + file, function (error) {
                                   cb(error);
                               });
                           } else {
                               cb(error);
                           }
                       });
                   }
               }, function (error) {
                    callback(error);
               });
           } else {
               callback(null);
           }
       } else {
           callback(error);
       }
    });
}

exports.deleteFile = deleteFile;