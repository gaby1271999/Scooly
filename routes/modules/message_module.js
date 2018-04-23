var fs = require('fs');
var inbox = require('inbox');
var nodemailer = require('nodemailer');
var async = require('async');
var mailparser = require('mailparser');
var database = require(__dirname.replace('modules', 'database'));


function getMailsObject(id, address, from, to, cb) {

        /*
        if (to-from <= 10) {
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
                    console.log('error to mail server')
                    client.close();

                    return cb([]);
                });

                client.on('connect', function () {
                    console.log('inbox ready');

                    client.openMailbox("INBOX", true, function (error, info) {
                        if (error) {
                            return cb([]);
                        }

                        async.waterfall([
                                function (callback) {
                                    client.listMessagesByUID((info.UIDNext - 1 - to) < 1 ? 1 : (info.UIDNext - 1 - to), info.UIDNext - 1 - from, function (err, messages) {
                                        if (!error) {
                                            return callback(null, messages);
                                        }

                                        return callback(err);
                                    });
                                },

                                function (messages, callback) {
                                    var inbox = {amount: info.count, mails: []};

                                    async.each(messages, function (message, callback) {
                                        var object = {};

                                        object['mailbox'] = "INBOX";
                                        object['UID'] = message.UID;
                                        object['from'] = message.from;
                                        object['to'] = message.to;
                                        if (message.cc != undefined) {
                                            object['cc'] = message.cc;
                                        }
                                        if (message.bcc != undefined) {
                                            object['bcc'] = message.bcc;
                                        }
                                        object['title'] = message.title;
                                        object['date'] = message.date;

                                        var messageStream = client.createMessageStream(message.UID);

                                        mailparser.simpleParser(messageStream).then(function (mail) {
                                            object['body'] = mail.html;

                                            inbox.mails[inbox.mails.length] = object;
                                            callback();
                                        });
                                    }, function (err) {
                                        if (!err) {
                                            callback(null, inbox);
                                        }
                                    });
                                }],

                            function (error, result) {
                                if (!error) {
                                    cb(result);
                                }

                                client.close();

                                if (error) {
                                    return cb([]);
                                }
                            });
                    });
                });
            });
        } else {
            return cb([]);
        }*/
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
