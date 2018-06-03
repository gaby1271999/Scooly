var async = require('async');
var fs = require('fs');
var fse = fs = require('fs-extra');
var path = require('path');

var direction = __dirname.replace('routes\\modules', 'private/mydocuments');


function getDocuments(user_id, dir, callback) {
    if (!fs.existsSync(direction)) {
        fs.mkdirSync(direction);
        callback([]);
    } else {
        if (fs.existsSync(direction + '/' + user_id + dir)) {
            fs.readdir(direction + '/' + user_id + dir, function (error, files) {
               if (!error) {
                   var list = [];

                   async.each(files, function (file, cb) {
                      var object = {filename: file};

                      object['type'] = (fs.statSync(direction + '/' + user_id + dir+ '/' + file).isDirectory() ? 0 : 1);

                      getSize(direction + '/' + user_id + dir+ '/' + file, function (size) {
                         object['size'] = sizeToString(size);

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
        } else {
            callback([]);
        }
    }
}

function getSize(path, callback) {
    if (fs.statSync(path).isDirectory()) {
        fs.readdir(path, function (error, files) {
            if (!error && files.length > 0) {
                var size = 0;
                async.each(files, function (file, cb) {
                    getSize(path + '/' + file, function (s) {
                        size += s;
                        cb();
                    });
                }, function () {
                    callback(size);
                });
            } else {
                callback(0);
            }
        });
    } else {
        callback(fs.statSync(path).size);
    }
}

function sizeToString(inbytes) {
    var rounds = 0;
    var size;

    do {
        size = inbytes/(Math.pow(1000, (rounds+1)));

        if (parseInt(inbytes/(Math.pow(1000, (rounds+1)))) > 1) {
            rounds++;
        }
    } while (parseInt(size) > 1);

    var types = ['bytes', 'KB', 'MB', 'GB', 'TB'];

    return (inbytes/(Math.pow(1000, (rounds)))).toFixed(2).toString() + (types[rounds] != undefined ? types[rounds] : '');
}

function getPath(user_id, dir, callback) {
    if (fs.existsSync(direction + '/' + user_id + dir)) {
        callback(null, direction + '/' + user_id + dir);
    } else {
        callback('ERROR');
    }
}

function addFolder(user_id, dir, callback) {
    if (!fs.existsSync(direction + '/' + user_id)) {
        fs.mkdirSync(direction + '/' + user_id);
    }

    if (!fs.existsSync(direction + '/' + user_id + dir)) {
        fs.mkdirSync(direction + '/' + user_id + dir);
    }

    callback();
}

exports.getDocuments = getDocuments;
exports.getPath = getPath;
exports.addFolder = addFolder;