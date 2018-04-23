var config = require('yaml-config');

var dir = __dirname.replace('routes\\utils', 'private/configs/config.yml');
var weekPlanning = config.readConfig(dir, "weekplanning");

function getWeekPlanning() {
    return weekPlanning;
}

exports.getWeekPlanning = getWeekPlanning;