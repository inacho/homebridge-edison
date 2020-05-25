const TuyAPI = require('tuyapi');
const async = require("async");

let Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-edison", "edison", controller);
}

function controller(log, config) {
    this.log = log;
    this.name = config["name"];
    this.config = config;

    this.device = new TuyAPI({
        ip: this.config["ip"],
        id: this.config["id"],
        key: this.config["key"],
        version: 3.3
    });

    this.device.on('connected', () => {
        this.log.info('[edison] Connected to device');
    });

    this.device.on('disconnected', () => {
        this.log.info('[edison] Disconnected from device');
    });

    this.device.on('error', error => {
        this.log.warn('[edison] Error from device:', error);
    });

    this.queueUpdate = async.queue( (data, callback) => {
        (async () => {
            callback(null);

            try {
                await this.device.connect();
                await this.device.set(data);
            } catch (e) {
                this.log.warn('[edison] Caught Error: ' + e.toString());
            }
        })();
    }, 1);

    this.on = false;
    this.brightness = 10;

    this.service = new Service.Lightbulb(this.name);

    this.service.getCharacteristic(Characteristic.On)
        .on('get', this.getOn.bind(this))
        .on('set', this.setOn.bind(this));

    this.service.addCharacteristic(Characteristic.Brightness)
        .on('get', this.getBrightness.bind(this))
        .on('set', this.setBrightness.bind(this));
}

// get the status
controller.prototype.getOn = function(callback) {
    callback(null, this.on);
}

// set the status
controller.prototype.setOn = function(on, callback) {
    if (on === this.on) {
        callback(null);
        return;
    }

    this.on = on;
    this.queueUpdate.push({dps: '20', set: on}, callback);
}

// get the brightness
controller.prototype.getBrightness = function(callback) {
    callback(null, this.brightness);
}

// set the brightness
controller.prototype.setBrightness = function(brightness, callback) {
    if (brightness === 0) {
        this.brightness = brightness;
        callback(null);
        return;
    }

    // Brightness already set
    if (brightness === this.brightness) {
        callback(null);
        return;
    }

    this.brightness = brightness;
    this.queueUpdate.push({dps: '22', set: (brightness * 10)}, callback);
}

controller.prototype.getServices = function() {
    return [this.service];
}
