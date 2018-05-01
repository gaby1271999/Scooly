var fs = require('fs');
var inbox = require('inbox');
var nodemailer = require('nodemailer');
var async = require('async');
var database = require(__dirname.replace('modules', 'database'));


function getMailsObject(id, from, to, location, callback) {
    if (to-from >= 15) {
        callback([]);
    } else {
        database.getMails(function (mails) {
            var list = [];

            async.each(mails, function (mail, cb) {
                database.inLocation(mail.id, id, location, function (result) {
                    if (result) {
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
                    } else {
                        cb();
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

function sendMail(id, to, title, body, callback) {
    database.getMailAdress(id, function (address) {
        database.getPassword(id, function (password) {
            var transporter = nodemailer.createTransport({
                host: 'scooly.eu',
                secure: true,
                port: 465,
                auth: {
                    user: address + '@scooly.eu',
                    pass: password
                },
                tls: {
                    rejectUnauthorized: false
                }
            });

            var mailOptions = {
                from: address + '@scooly.eu',
                to: to,
                subject: title,
                html: body
            }

            transporter.sendMail(mailOptions, function (error) {
                if (!error) {
                    console.log('sended');
                    return callback(true);
                } else {
                    return callback(false);
                }
            });
        });
    });
}

function getMailboxes(id, address) {
    database.getPassword(id, function (password) {
        var client = inbox.createConnection(993, "5.189.160.80", {
            secureConnection: true,
            auth: {
                user: address + "@scooly.eu",
                pass: password
            }
        });

        client.connect();

        client.on('error', function () {
            client.close();
        });

        client.on('connect', function () {
            client.moveMessage(15, "INBOX", function(err){
                console.log(err || "success, moved to junk");
            });

            client.listMailboxes(function(error, mailboxes){
                console.log(mailboxes);
            });
        });
    });
}

exports.getMailsObject = getMailsObject;
exports.sendMail = sendMail;
exports.getMailboxes = getMailboxes;
