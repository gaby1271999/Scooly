var config = require('yaml-config');
var p = require('path');
var mainFolder = require(__dirname + '/main_folder');

var dir = p.join(mainFolder.mainFolder(), 'private/configs/config.yml');
var weekPlanning = config.readConfig(dir, "weekplanning");

function getWeekPlanning() {
    return weekPlanning;
}

exports.getWeekPlanning = getWeekPlanning;