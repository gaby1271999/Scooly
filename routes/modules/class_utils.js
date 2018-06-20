var async = require('async');
var fs = require('fs');
var fse = fs = require('fs-extra');
var p = require('path');

var database = require(__dirname.replace('modules', 'database'));
var mainFolder = require(__dirname.replace('modules', '/utils/main_folder'));
var scheduleManager = require('./schedule_manager');

var direction = p.join(mainFolder.mainFolder(), 'private/subjects');
function getFiles(user_id, path, callback) {
    database.getUserClassName(user_id, function (error, class_name) {
        if (!error) {
            if (class_name.length > 0) {
                var pathArgs = path.split('/');
                var subject = path.split('/')[0];
                var newPath = subject + '/' + class_name;

                for (var index in pathArgs) {
                    if (index > 1) {
                        newPath += '/' + pathArgs[index];
                    }
                }

                scheduleManager.getStudentWeek(class_name, function (lessons) {
                    async.each(lessons, function (lesson, cb) {
                        if (lesson.subject == subject) {
                            cb(lesson.teacher);
                        } else {
                            cb();
                        }
                    }, function (teacher) {
                        if (teacher != undefined) {
                            database.getUserId(teacher, function (error, teacher_id) {
                                if (!error) {
                                    getDirectionInformation(teacher_id, direction + '/' + teacher_id + '/' + newPath, newPath, false, function (list) {
                                        callback(list);
                                    });
                                } else {
                                    callback([]);
                                }
                            });
                        } else {
                            callback([]);
                        }
                    });
                });
            } else {
                var dir = direction + '/' + user_id + '/' + path;

                if (fs.existsSync(dir)) {
                    getDirectionInformation(user_id, dir, path, true, function (list) {
                        callback(list);
                    });
                } else {
                    callback([]);
                }
            }
        } else {
            callback([]);
        }
    });
}

function getDirectionInformation(user_id, dir, path, canSee, callback) {
    fs.readdir(dir, function (error, files) {
       if (!error) {
           var list = [];

           async.each(files, function (file, cb) {
               var type = fs.statSync(dir + '/' + file).isDirectory() ? 0 : 1;
               getSize(dir + '/' + file, function (size) {
                   var object = {name: file, type: type, size: sizeToString(size)};

                   database.getVisability(user_id + '/' + path + '/' + file, function (error, result) {
                       var see = false;
                       if (!error) {
                           see = result.visability;
                       }

                       object['visible'] = see;

                       if (canSee || see) {
                           database.getSubjectNote(user_id, user_id + '/' + path + '/' + file, function (error, note) {
                               if (note != undefined) {
                                   if (canSee || note.public) {
                                       object['note'] = note;
                                   }
                               }

                               list[list.length] = object;

                               cb();
                           });
                       } else {
                           cb();
                       }
                   });
               });
           }, function () {
               callback(list);
           });
       } else {
           callback([]);
       }
    });
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

function getSubjects(id, groupName, callback) {
    scheduleManager.getStudentWeek(groupName, function (lessons) {
        if (lessons != null) {
            var subjects = [];

            for (var index in lessons) {
                var contains = false;
                for (var subjectsIndex in subjects) {
                    if (subjects[subjectsIndex] == lessons[index].subject) {
                        contains = true;
                        break;
                    }
                }

                if (!contains) {
                    subjects[subjects.length] = lessons[index].subject;
                }
            }

            return callback(subjects);
        } else {
            database.getUsername(id, function (err, name) {
                scheduleManager.getTeacherWeek(name, function (teacherLessons) {
                    if (teacherLessons != null) {
                        var subjects = [];

                        for (var index in teacherLessons) {
                            var periodObject = teacherLessons[index];
                            var contains = false;

                            for (var subjectIndex in subjects) {
                                var subject = subjects[subjectIndex];

                                if (periodObject.class == subject.class && periodObject.subject == subject.subject) {
                                    contains = true;
                                }
                            }

                            if (!contains) {
                                var object = {};

                                object.class = periodObject.class;
                                object.subject = periodObject.subject;

                                subjects[subjects.length] = object;
                            }
                        }

                        return callback(subjects);
                    } else {
                        return callback([]);
                    }
                });
            });
        }
    });
}

function getSubFiles(fName, dir, filePath, canSee, callback) {
    var teacherId = filePath.split('/')[0];

    fs.readdir(dir, function (err, files) {
        var object = {type: 0, name: fName, size: null, files: []};

        async.each(files, function (file, cb) {
            database.getVisability(filePath + '/' + file, function (error, result) {
                var visible = false;
                if (result != undefined) {
                    visible = result.visability;
                }

                if (canSee || visible) {
                    if (p.extname(file).length == 0) {
                        getSubFiles(file, dir + '/' + file, filePath + '/' + file, canSee, function (newDirFiles) {
                            database.getSubjectNote(teacherId, filePath + '/' + file, function (error, note) {
                                if (note != undefined) {
                                    if (canSee || note.public) {
                                        newDirFiles['note'] = note;
                                    }
                                }

                                var size = sizeToString(fs.statSync(dir + '/' + file).size);

                                newDirFiles['size'] = size;
                                newDirFiles['visible'] = visible;
                                object.files[object.files.length] = newDirFiles;

                                return cb();
                            });
                        });
                    } else {
                        database.getSubjectNote(teacherId, filePath + '/' + file, function (error, note) {
                            var size = sizeToString(fs.statSync(dir + '/' + file).size);
                            object.files[object.files.length] = {type: 1, name: file, size: size, visible: visible};

                            if (note != undefined) {
                                if (canSee || note.public) {
                                    object.files[object.files.length-1]['note'] = note;
                                }
                            }

                            return cb();
                        });
                    }
                } else {
                    cb();
                }
            });
        }, function (err) {
            if (!err) {
                return callback(object);
            }

            callback(null);
        });
    });
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

function getDocuments(subject, id, className, callback) {
    var dir = p.join(mainFolder.mainFolder(), 'private/subjects');

    if (fs.existsSync(dir + '/' + id + '/' + subject)) {
        dir += '/' + id + '/' + subject + '/' + className;

        fs.readdir(dir, function (err, files) {
            if (!err) {
                var dirFiles = [];

                async.each(files, function (file, cb) {
                    database.getVisability(id + '/' + subject + '/' + className + '/' + file, function (error, result) {
                        if (p.extname(file).length == 0) {
                            getSubFiles(file, dir + '/' + file, id + '/' + subject + '/' + className + '/' + file, true, function (object) {
                                dirFiles[dirFiles.length] = object;
                                var size = sizeToString(fs.statSync(dir + '/' + file).size);
                                object.size = size;

                                var visible = false;
                                if (result != undefined) {
                                    visible = result.visability;
                                }
                                object.visible = visible;

                                database.getSubjectNote(id, id + '/' + subject + '/' + className + '/' + file, function (error, note) {
                                    if (!error) {
                                        for (var i in dirFiles) {
                                            var o = dirFiles[i];
                                            if (o.name == file) {
                                                o.note = note;
                                            }
                                        }

                                    }

                                    cb();
                                });
                            });
                        } else {
                            var size = sizeToString(fs.statSync(dir + '/' + file).size);

                            var visible = false;
                            if (result != undefined) {
                                visible = result.visability;
                            }

                            dirFiles[dirFiles.length] = {type: 1, name: file, size: size, visible: visible};

                            database.getSubjectNote(id, id + '/' + subject + '/' + className + '/' + file, function (error, note) {
                                if (!error) {
                                    for (var i in dirFiles) {
                                        var o = dirFiles[i];
                                        if (o.name == file) {
                                            o.note = note;
                                        }
                                    }
                                }

                                cb();
                            });
                        }
                    });
                }, function (err) {
                    if (!err) {
                        return callback(dirFiles);
                    } else {
                        return callback([]);
                    }
                })
            } else {
                return callback([]);
            }
        });
    } else if (className.length > 0) {
        scheduleManager.getStudentWeek(className, function (lessons) {
            var foundTt = false;

            for (var index in lessons) {
                var object = lessons[index];

                if (object.subject == subject) {
                    foundTt = true;

                    database.getUserId(object.teacher, function (error, teacherId) {
                        if (!error) {
                            dir = dir + '/' + teacherId + '/' + subject + '/' + className;

                            fs.readdir(dir, function (err, files) {
                                if (!err) {
                                    var dirFiles = [];

                                    async.each(files, function (file, cb) {
                                        database.getVisability(teacherId + '/' + subject + '/' + className + '/' + file, function (error, result) {
                                            if (result != undefined) {
                                                if (result.visability) {
                                                    if (p.extname(file).length == 0) {
                                                        getSubFiles(file, dir + '/' + file, teacherId + '/' + subject + '/' + className + '/' + file, false, function (object) {
                                                            database.getSubjectNote(teacherId, teacherId + '/' + subject + '/' + className + '/' + file, function (error, note) {
                                                                if (note != undefined) {
                                                                    if (note.public == 1) {
                                                                        object['note'] = note;
                                                                    }
                                                                }

                                                                var size = sizeToString(fs.statSync(dir + '/' + file).size);

                                                                object['size'] = size;
                                                                dirFiles[dirFiles.length] = object;
                                                                cb();
                                                            });
                                                        });
                                                    } else {
                                                        database.getSubjectNote(teacherId, teacherId + '/' + subject + '/' + className + '/' + file, function (error, note) {
                                                            if (note != undefined) {
                                                                if (note.public == 1) {
                                                                    file['note'] = note;
                                                                }
                                                            }

                                                            var size = sizeToString(fs.statSync(dir + '/' + file).size);

                                                            file['size'] = size;
                                                            dirFiles[dirFiles.length] = file;
                                                            cb();
                                                        });
                                                    }
                                                } else {
                                                    cb();
                                                }
                                            } else {
                                                cb();
                                            }
                                        });
                                    }, function (err) {
                                        if (!err) {
                                            return callback(dirFiles);
                                        } else {
                                            return callback([]);
                                        }
                                    })
                                } else {
                                    return callback([]);
                                }
                            });
                        } else {
                            return callback([]);
                        }
                    });

                    break;
                }
            }

            if (!foundTt) {
                return callback([]);
            }
        });
    } else {
        return callback([]);
    }
}

function getDocumentPath(userId, subject, filePath, callback) {
    var dir = p.join(mainFolder.mainFolder(), 'private/subjects');

    if (fs.existsSync(dir + '/' + userId)) {
        dir += '/' + userId + '/' + subject + '/' + filePath;

        if (fs.existsSync(dir)) {
            return callback(null, dir);
        } else {
            return callback('ERROR');
        }
    } else {
        database.getUserClassName(userId, function (error, className) {
            scheduleManager.getStudentWeek(className, function (schedule) {
                var foundTt = false;

                for (var index in schedule) {
                    var object = schedule[index];

                    if (object.subject == subject) {
                        foundTt = true;

                        database.getUserId(object.teacher, function (error, id) {
                            if (!error) {
                                dir += '/' + id + '/' + subject + '/' + className + '/' + filePath;

                                return callback(null, dir);
                            }

                            callback('ERROR');
                        });

                        break;
                    }
                }

                if (!foundTt) {
                    callback('ERROR');
                }
            });
        });
    }
}

function uploadNewFile(id, dir, filePath, callback) {
    var subjectDir = p.join(mainFolder.mainFolder(), 'private/subjects') + '/' + id;

    if (fs.existsSync(subjectDir)) {
        subjectDir += '/' + dir;

        fse.move(filePath, subjectDir, { overwrite: true }, function (error) {
            if (!error) {
                return callback(null);
            } else {
                return callback('ERROR');
            }
        });
    } else {
        return callback('ERROR');
    }
}

function addFolder(path, callback) {
    var dir = p.join(mainFolder.mainFolder(), 'private/subjects');

    var argsPath = path.split('/');

    var checkPath = dir;
    for (var index in argsPath) {
        checkPath += '/' + argsPath[index];

        if (!fs.existsSync(checkPath)) {
            fs.mkdirSync(checkPath);
        }
    }

    dir += '/' + path

    if (!fs.existsSync(dir)){
        fs.mkdir(dir, function (error) {

            if (!error) {
                return callback(null);
            } else {
                return callback('ERROR');
            }
        });
    } else {
        return callback('ERROR');
    }
}

function getTeacherId(subject, className) {

}

exports.getSubjects = getSubjects;
exports.getDocuments = getDocuments;
exports.getDocumentPath = getDocumentPath;
exports.uploadNewFile = uploadNewFile;
exports.addFolder = addFolder;
exports.getFiles = getFiles;