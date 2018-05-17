var database = require(__dirname.replace('utils', '') + 'database');
var fs = require('fs');
var async = require('async');

var direction = __dirname.replace("routes\\utils", "private/mails/temp");
var mailDirection = __dirname.replace("routes\\utils", "private/mails/mails");


function updateAttachment(mail_id, user_id, callback) {
    database.getMailFrom(mail_id, function (error, from_id) {
        if (!error) {
            if (from_id == user_id) {
                database.hasAttachment(mail_id, function (error, result) {
                   if (!error) {
                       if (!result) {
                           async.waterfall([
                               function (cb) {
                                   if (!fs.existsSync(direction + '/' + from_id)) {
                                       fs.mkdirSync(direction + '/' + from_id);
                                       cb(null, false);
                                   } else {
                                       cb(null, true);
                                   }
                               },

                               function (dir, cb) {
                                   if (dir) {
                                       fs.readdir(direction + '/' + from_id, function (error, files) {
                                           if (!error) {
                                               if (files.length > 0) {
                                                   cb(null, true, files);
                                               } else {
                                                   cb(null, false, null);
                                               }
                                           } else {
                                               cb(null, false, null);
                                           }
                                       });
                                   } else {
                                       cb(null, false, null);
                                   }
                               },
                               
                               function (replace, files, cb) {
                                   if (replace) {
                                       var newDir = mailDirection + '/' + from_id + '/' + mail_id;

                                       if (!fs.existsSync(mailDirection + '/' + from_id)) {
                                           fs.mkdirSync(mailDirection + '/' + from_id);
                                       }
                                       
                                       if (!fs.existsSync(mailDirection + '/' + from_id + '/' + mail_id)) {
                                           fs.mkdirSync(mailDirection + '/' + from_id + '/' + mail_id);
                                       }

                                       async.each(files, function (file, cb) {
                                           fs.rename(direction + '/' + from_id + '/' + file, newDir + '/' + file, function (error) {
                                               cb(null);
                                           });
                                       }, function () {
                                           cb(null);
                                       });
                                   } else {
                                       cb(null);
                                   }
                               }
                           ], function () {
                               callback();
                           });
                       } else {
                           var path = direction + '/' + from_id;

                           if (fs.existsSync(path)) {
                               fs.readdir(path, function (error, files) {
                                   if (!error) {
                                       var newDir = mailDirection + '/' + from_id + '/' + mail_id;

                                       if (!fs.existsSync(mailDirection + '/' + from_id)) {
                                           fs.mkdirSync(mailDirection + '/' + from_id);
                                       }

                                       if (!fs.existsSync(mailDirection + '/' + from_id + '/' + mail_id)) {
                                           fs.mkdirSync(mailDirection + '/' + from_id + '/' + mail_id);
                                       }

                                       async.each(files, function (file, cb) {
                                           fs.rename(path + '/' + file, newDir + '/' + file, function () {
                                               cb();
                                           });
                                       }, function () {
                                           callback();
                                       });
                                   } else {
                                       callback();
                                   }
                               });
                           } else {
                               callback();
                           }
                       }
                   } else {
                       callback();
                   }
                });
            } else {
                callback();
            }
        } else {
            callback();
        }
    });
}

exports.updateAttachment = updateAttachment;