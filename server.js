/**
 *      BLEPS (Bluetooth LE Presence Server)
 *      @module bleps
 *      @version 1.1, 2019/09/02
 *      @author Matthias Schmoldt
 */

var global = {};
var config = {};
var net = require('net');
var noble = require('noble');

var netServer = null;

var nobleTimer = null;

var devices = [];
var devicesTemp = [];


/**
 *      Global - Configuration
 */

global.version = 1.1;

config.debug = 0;
config.port = 5669;
config.scanInterval = 5000;
config.name = "Default"


/**
 *      Global - Functions
 */
function log(subject, message, debug) {
        if (config.debug >= debug) {
                console.log(subject + " " + message);
        }
}
log("CORE", "Starting BLEPS (Bluetooth LE Presence Server)", 0);


/**
 *      Noble - Event: New device discovered
 */
noble.on('discover', function(peripheral) {

        devicesTemp.push({
                address: peripheral.address,
                name: peripheral.advertisement.localName,
                source: config.name,
                time: new Date()
        });

});


/**
 *      Noble - Scaninterval definition
 */
nobleTimer = setInterval(function () {

        var deviceFound = false;

        // stop scanning
        noble.stopScanning();

        // loop through currently present devices
        for (var i = 0; i < devicesTemp.length; i++) {

                // update existing device
                deviceFound = false;
                for (var x = 0; x < devices.length; x++) {
                        if (devicesTemp[i].address == devices[x].address) {
                                deviceFound = true;
                                devices[x].time = devicesTemp[i].time;
                        }
                }

                // add new device
                if (!deviceFound) {
                        devices.push(devicesTemp[i]);
                }
        }

        // unset temp devices
        devicesTemp = [];

        // start scanning
        noble.startScanning();

}, config.scanInterval);
log("NOBLE", "Scan for devices started periodically (" + config.scanInterval + " ms)", 0);



/**
 *      Net - TCP-Server definition
 */
netServer = net.createServer(function(socket) {

        // Message to new clients
        socket.write('[BLEPS]\r\n');

        // Error-Handler
        socket.on("error", function(err) {
        });

        // Data-Handler
        socket.on("data", function(data) {
                var cmds  = data.toString().split("\r\n");
                var cmd;
                var cmdArgs;
                for (var i = 0; i < cmds.length; i++) {
                        cmd = cmds[i].trim();
                        if (cmd.length > 0) {
                                var cmdArgs = cmd.split(" ");
                                switch (cmdArgs[0]) {
                                        case "help":
                                                if (cmdArgs.length == 1) {
                                                        socket.write("help              show this help message\r\n");
                                                        socket.write("list              show all devices\r\n");
                                                        socket.write("present [1]       show devices present in specified time.\r\n");
                                                        socket.write("present [1] [2]   show device present in specified time.\r\n");
                                                        socket.write("sync [1]          sync devices with specified bleps instance.\r\n");
                                                        socket.write("ver               show version info.\r\n");
                                                        socket.write("exit              close current session\r\n");
                                                        socket.write("OK\r\n");
                                                } else {
                                                        socket.write("Error, invalid number of arguments\r\n");
                                                }
break;
                                        case "list":
                                                for (var i = 0; i < devices.length; i++) {
                                                        socket.write(devices[i].address + "\t" + devices[i].name + "\t" + devices[i].source + "\t" + devices[i].time + "\r\n");
                                                }
                                                socket.write("OK\r\n");
                                        break;
                                        case "present":
                                                var currentTime = new Date();
                                                if (cmdArgs.length == 3) {
                                                        for (var i = 0; i < devices.length; i++) {
                                                                if (((currentTime.getTime() - devices[i].time.getTime()) / 1000) > cmdArgs[1]) {
                                                                        continue;
                                                                }
                                                                if (devices[i].address == cmdArgs[2]) {
                                                                        socket.write(devices[i].address + "\r\n");
                                                                }
                                                        }
                                                        socket.write("OK\r\n");
                                                } else if (cmdArgs.length == 2) {
                                                        for (var i = 0; i < devices.length; i++) {
                                                                if (((currentTime.getTime() - devices[i].time.getTime()) / 1000) > cmdArgs[1]) {
                                                                        continue;
                                                                }
                                                                socket.write(devices[i].address + "\r\n");
                                                        }
                                                        socket.write("OK\r\n");
                                                } else {
                                                        socket.write("Error, invalid args\r\n");
                                                }
                                        break;
                                        case "sync":
                                                if (cmdArgs.length == 3) {
                                                        socket.write("OK\r\n");
                                                        var client = new net.Socket();
                                                        var deviceLine = [];
                                                        client.connect(cmdArgs[3], cmdArgs[2], function() {
                                                                client.write('list');
                                                        });
                                                        client.on('data', function(data) {
                                                                var lines = data.toString().split("\r\n");
                                                                for (var i = 0; i < lines.length; i++) {
                                                                        var recv = lines[i].trim();
                                                                        if (recv == "[BLEPS]") {
 
                                                                        } else if (recv == "OK") {
                                                                                client.destroy();
                                                                                callback(devices);
                                                                        } else if (recv == "") {
} else {
                                                                                deviceLine = recv.split("\t");
                                                                                devicesTemp.push({
                                                                                        address: deviceLine[0],
                                                                                        name: deviceLine[1],
                                                                                        source: deviceLine[2],
                                                                                        time: new Date(deviceLine[3])
                                                                                });
                                                                        }
                                                                }
                                                        });
                                                } else {
                                                        socket.write("Error, invalid number of arguments.\r\n");
                                                }
                                        break;
                                        case "ver":
                                                socket.write(global.version + "\r\n");
                                                socket.write("OK\r\n");
                                        break;
                                        case "exit":
                                                socket.write("OK\r\n");
                                                socket.destroy();
                                        break;
                                        default:
                                                socket.write("Error, invalid command. See help for more info...\r\n");
                                }
                        }
                }
        });

});


/**
 *      Net / TCP-Server start
 */
netServer.listen(config.port);
log("TCP-SERVER", "Server started at port " + config.port + ".", 0);
