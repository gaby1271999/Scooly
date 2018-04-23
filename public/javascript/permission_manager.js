function hasPermission(permission, cb) {
    $.getJSON(window.origin + '/json/haspermission/' + permission, function (data) {
        return cb(data.hasPermission);
    });
}