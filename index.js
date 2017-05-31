var fs = require('fs');
var ndjson = require('ndjson');
var LineByLineReader = require('line-by-line');
var Async = require('async');
var Canvas = require('canvas');
var exec = require('child_process').exec;

BASE_WIDTH = 255
BASE_HEIGHT = 255
SCALED_WIDTH = 1920
SCALED_HEIGHT = 1080
SCALING = 2
X_OFFSET = (SCALED_WIDTH - BASE_WIDTH * SCALING) / 2
Y_OFFSET = (SCALED_HEIGHT - BASE_HEIGHT * SCALING) / 2
SLOWDOWN = 2
FRAMERATE = 25
WORD_TIME_SEC = 3
FONT_SIZE = 80

var frame = 0;

exec("rm -f frames/*");

function getDrawingsLineCount(theme, callback) {
  var reader = new LineByLineReader("samples/" + theme + ".ndjson");
  var nblines = 0;

  reader.on('error', callback);
  reader.on('line', function() {
    nblines++;
  });
  reader.on('end', function() {
    callback(null, nblines);
  });
}

function getDrawingAtLine(theme, lineNb, callback) {
  var reader = new LineByLineReader("samples/" + theme + ".ndjson");
  var nblines = 0;

  reader.on('error', callback);
  reader.on('line', function(line) {
    if (nblines == lineNb) {
      callback(null, JSON.parse(line));
    }
    nblines++;
  });
}

function selectRandomDrawing(theme, callback) {
  getDrawingsLineCount(theme, function(err, lineCount) {
    if (err) {
      return callback(err);
    }

    getDrawingAtLine(theme, Math.floor(Math.random() * lineCount), function(err, drawing) {
      if (err) {
        return callback(err);
      }
      callback(null, drawing);
    });
  });
}

function generateVideo(drawing) {
  var canvas = new Canvas(SCALED_WIDTH, SCALED_HEIGHT);

  var ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#000';
  ctx.fillStyle = "#fff";
  ctx.lineWidth = SCALING;
  ctx.font = FONT_SIZE + "px Comfortaa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (var strokeNumber in drawing.drawing) {
    var xs = drawing.drawing[strokeNumber][0]
    var ys = drawing.drawing[strokeNumber][1]

    for (var strokeFrame = 1; strokeFrame < xs.length; strokeFrame++) {
      ctx.beginPath();
      ctx.lineTo(
        xs[strokeFrame - 1] * SCALING + X_OFFSET,
        ys[strokeFrame - 1] * SCALING + Y_OFFSET
      );
      ctx.lineTo(
        xs[strokeFrame] * SCALING + X_OFFSET,
        ys[strokeFrame] * SCALING + Y_OFFSET
      );
      ctx.stroke();

      for (var repeatedFrame = 0; repeatedFrame < SLOWDOWN; repeatedFrame++) {
        fs.writeFileSync('frames/' + frame++ + '.png', canvas.toBuffer());
      }
    }
  }
  ctx.fillStyle = "#000";
  ctx.fillText(drawing.word, (SCALED_WIDTH / 2) - (ctx.measureText(drawing.word).width / 2), SCALED_HEIGHT - FONT_SIZE);

  // Display the word for enough time
  for (var repeatedFrame = 0; repeatedFrame < FRAMERATE * WORD_TIME_SEC; repeatedFrame++) {
    fs.writeFileSync('frames/' + frame++ + '.png', canvas.toBuffer());
  }
}

Async.map(["bear", "train", "banana", "bicycle", "carrot", "castle"], selectRandomDrawing, function(err, drawings) {
  for (drawing of drawings) {
    generateVideo(drawing);
  }
  exec("ffmpeg -y -i frames/%d.png -i background_music_full.mp3 -c:v libx264 -r " + FRAMERATE + " -pix_fmt yuv420p -shortest output.mp4", function(error, stdout, stderr) {
    console.log(stderr);
  });
});
