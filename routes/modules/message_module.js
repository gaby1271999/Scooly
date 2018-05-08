var async = require('async');
var database = require(__dirname.replace('modules', 'database'));


function getMailsObject(id, from, to, location, callback) {
    if (to-from >= 15) {
        callback([]);
    } else {
        database.getMails(function (mails) {

            var list = [];

            async.each(mails, function (mail, callb) {
                database.inLocation(mail.id, id, location, function (error, results) {
                    if (!error) {
                        async.each(results, function (locObject, cb) {
                            database.getUsername(mail.from_id, function (error, username) {
                                if (!error) {
                                    database.mailInfo(mail.id, id, function (error, header) {
                                        if (!error) {
                                            database.isMailOpened(mail.id, id, function (error, opened) {
                                                if (!error) {
                                                    delete mail['from_id'];
                                                    mail['from'] = username;
                                                    mail['header'] = header;
                                                    mail['opened'] = opened;
                                                    mail['location'] = locObject.location;

                                                    list[list.length] = mail;
                                                    cb();
                                                } else {
                                                    cb();
                                                }
                                            });
                                        } else {
                                            cb();
                                        }
                                    });
                                } else {
                                    cb();
                                }
                            });
                        }, function () {
                            callb();
                        });
                    } else {
                        callb();
                    }
                });
            }, function () {
                list.sort(function (a, b) {
                    return new Date(b.date) - new Date(a.date);
                });

                var newList = list.slice(from, to);

                callback(newList);
            });
        });
    }
}

exports.getMailsObject = getMailsObject;
