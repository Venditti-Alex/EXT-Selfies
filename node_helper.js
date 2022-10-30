/**
 * @todo set default camera
**/

const NodeWebcam = require( "node-webcam" );
const moment = require("moment");
const path = require("path");
const exec = require("child_process").exec;
var nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

var log = () => { /* do nothing */ };

var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
  start: function() {
    this.devices = []
    this.device = false
  },

  initialize: function(payload) {
    this.config = payload
    if (payload.debug) {
      log = (...args) => { console.log("[SELFIES]", ...args) }
    }

    var Webcam = NodeWebcam.create({})
    Webcam.list((list)=>{
      log("Searching camera devices...")
      if (!list || list.length <= 0) {
        log ("Cannot find any camera in this computer.")
        return
      }
      this.devices.concat(list);
      log("Detected devices:", list)
      if (payload.device) {
        var idx = list.indexOf(payload.device)
        if (idx !== -1) {
          this.device = list[idx]
          log(`'${payload.device}' will be used.`)
        } else {
          log(`Cannot find '${payload.device}' in the list. '${list[0]}' be selected as default.`)
        }
      } else {
        log(`Default camera '${list[0]}' will be used.`)
      }
      this.sendSocketNotification("INITIALIZED")
    })
  },

  socketNotificationReceived: function(noti, payload) {
    if (payload.debug) log("Notification received: " + noti)
    if (noti == "INIT") this.initialize(payload)
    if (noti == "SHOOT") {
      console.log('shoot payload:', payload)
      this.shoot(payload)
    }
    if (noti == "EMPTY") {
      var dir = path.resolve(__dirname, "photos")
      exec(`rm ${dir}/*.jpg`, (err, sto, ste)=>{
        log("Cleaning directory:", dir)
        if (err) this.log("Error:", err)
        if (sto) this.log(sto)
        if (ste) this.log(ste)
      })
    }
  },

  shoot: function(payload) {
    var uri = moment().format("YYMMDD_HHmmss") + ".jpg"
    var filename = path.resolve(__dirname, "photos", uri)
    var opts = Object.assign ({
      width: this.config.width,
      height: this.config.height,
      quality: this.config.quality,
      delay: 0,
      saveShots: true,
      output: "jpeg",
      device: this.device,
      callbackReturn: "location",
      verbose: this.config.debug
    }, (payload.options) ? payload.options : {})
    NodeWebcam.capture(filename, opts, (err, data)=>{
      if (err) log("Error:", err)
      log("Photo is taken:", data)
      this.sendSocketNotification("SHOOT_RESULT", {
        path: data,
        uri: uri,
        session: payload.session
      })
    })
  }
});
