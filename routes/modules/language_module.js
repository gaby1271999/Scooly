var fs = require('fs');

function getFile(request, callback) {
    var dir = __dirname.replace('routes\\modules', 'public/languages');

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


