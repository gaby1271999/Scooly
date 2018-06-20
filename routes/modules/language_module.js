var fs = require('fs');
var p = require('path');
var mainFolder = require(__dirname.replace('modules', '/utils/main_folder'));

function getFile(request, callback) {
    var dir = p.join(mainFolder.mainFolder(), 'public/languages');

    fs.readdir(dir, function (error, files) {
        if (!error) {
            files.forEach(function (file) {
                if (file.indexOf(request.language) > -1) {
                    callback(dir + '/' + file);
                }
            });
        }
    });
}

function createObject(dir) {
    var lines = fs.readFileSync(dir).toString().match(/^.+$/gm);

    var object = {};

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        object[line.split(': ')[0]] = line.split(': ')[1];
    }

    return object;
}


exports.getFile = getFile;
exports.createObject = createObject;


