var excel = require('exceljs');
var fs = require('fs');
var p = require('path');
var config = require('yaml-config');

var mainFolder = require(__dirname.replace('modules', '/utils/main_folder'));


var dir = p.join(mainFolder.mainFolder(), 'private/schedules');
var schedules = config.readConfig(p.join(mainFolder.mainFolder(), "private/configs/config.yml"), "schedules");
var scheduleObject = {};


function getScheduleFiles(callback) {
    fs.readdir(dir, function (err, files) {
        if (!err) {
            callback(files);
        }
    });
}

function getActivatedFiles(callback) {
    var filesList = [];
    var counter = 0;

    getScheduleFiles(function (files) {
        files.forEach(function (file) {
            schedules.activated.forEach(function (fileName) {
                if (file == fileName) {
                    filesList[counter] = file;
                    counter++;
                }
            });
        });

        callback(filesList);
    });
}

function createScheduleObject(callback) {
    var scheduleObject = {};

    getScheduleFiles(function (files) {
        files.forEach(function (file) {
            scheduleObject[file] = false;
        });

        getActivatedFiles(function (files) {
            files.forEach(function (file) {
                scheduleObject[file] = true;
            });

            callback(scheduleObject);
        });
    });
}

function changeActivatedSchedule(name, state) {
    var list = schedules.activated;

    if (state == 1) {
        list[list.length] = name;
    } else if (state == 0) {
        var index = list.indexOf(name);

        if (index > -1) {
            list.splice(index, 1);
        }
    }

    config.updateConfig(schedules, p.join(mainFolder.mainFolder(), "private/configs/config.yml"), "schedules");
}

function setupSchedules() {
    getActivatedFiles(function (files) {

        files.forEach(function (file) {
            var workbook = new excel.Workbook();
            var fileDir = dir + '/' + file;

            workbook.xlsx.readFile(fileDir)
                .then(function () {
                    workbook.eachSheet(function(worksheet, sheetId) {
                        worksheet.eachRow(function (row, rowNumber) {
                            //variables
                            var className = row.values[2];
                            var teacher = row.values[3];
                            var subject = row.values[4];
                            var day = row.values[6];
                            var hour = row.values[7];

                            //class
                            var classList = scheduleObject[className];
                            if (classList == undefined) {
                                classList = [];
                            }

                            var classObject = {};

                            classObject['teacher'] = teacher;
                            classObject['subject'] = subject;
                            classObject['day'] = day;
                            classObject['hour'] = hour;


                            classList[classList.length] = classObject;

                            scheduleObject[className] = classList;

                            //teacher
                            var teacherList = scheduleObject[teacher];
                            if (teacherList == undefined) {
                                teacherList = [];
                            }

                            var teacherObject = {};

                            teacherObject['class'] = className;
                            teacherObject['subject'] = subject;
                            teacherObject['day'] = day;
                            teacherObject['hour'] = hour;

                            teacherList[teacherList.length] = teacherObject;

                            scheduleObject[teacher] = teacherList;
                        });
                    });
                });
        })
    })
}

function getStudentWeek(groupName, callback) {
    for (var group in scheduleObject) {
        if (group == groupName) {
            return callback(scheduleObject[group]);
        }
    }

    return callback(null);
}

function getTeacherWeek(teacher, callback) {
    for (var name in scheduleObject) {
        if (name == teacher) {
            return callback(scheduleObject[name]);
        }
    }

    return callback(null);
}

exports.setupSchedules = setupSchedules;
exports.createScheduleObject = createScheduleObject;
exports.changeActivatedSchedule = changeActivatedSchedule;
exports.getTeacherWeek = getTeacherWeek;
exports.getStudentWeek = getStudentWeek;
