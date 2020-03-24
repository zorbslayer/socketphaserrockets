var config = {
  type: Phaser.AUTO,
  parent: 'phaser-example',
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: {
        y: 0
      }
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

var game = new Phaser.Game(config);
var graphics;
var startedPlaying = false;
const BLUE = 0x0000ff;
const RED = 0xff0000;
const menuTextDepth = 3;
const menuBgDepth = 2;
const gameObjectDepth = 1;
const bgDepth = 0;

function preload() {
  this.load.image('ship', 'assets/spaceShips_001.png');
  this.load.image('otherPlayer', 'assets/enemyBlack5.png');
  this.load.image('star', 'assets/star_gold.png');
  this.load.image('background', 'assets/background.png');
}

function create() {
  var self = this;
  var cam = this.cameras.main;
  self.stars = new Array();
  this.socket = io();
  this.otherPlayers = this.physics.add.group();
  this.starColliders = this.physics.add.group();
  this.mainMenu = this.physics.add.group();

  //add background
  let bg = this.add.image(0, 0, 'background').setOrigin(0,0);
  bg.setDepth(bgDepth);

  //add main menu background
  menuGraphics = this.add.graphics();
  menuGraphics.setDepth(-1000);
  menuGraphics.fillStyle(0x000000, 0.5);
  menuGraphics.fillRoundedRect(cam.centerX-200, cam.centerY-200, 400, 400, 8);
  menuGraphics.setScrollFactor(0);
  menuGraphics.setDepth(menuBgDepth);

  //add title
  this.titleText = this.add.text(cam.centerX-158, cam.centerY-180, 'Placeholder', { fontFamily: 'Roboto', fontSize: '64px', fill: '#FFFFFF', align: 'center' });
  this.titleText.setDepth(menuTextDepth);
  this.mainMenu.add(this.titleText);

  //add play button
  this.playButton = this.add.text(cam.centerX-60, cam.centerY+100, 'Play', { fontFamily: 'Roboto', fontSize: '64px', fill: '#FFFFFF', align: 'center' })
     .setInteractive()
     .on('pointerdown', function () { 
       self.socket.emit('playerJoined'); 
       self.mainMenu.destroy();
     } )
     .on('pointerover', function () { self.playButton.setStyle({ fill: '#ff0'}); } )
     .on('pointerout', function () { self.playButton.setStyle({ fill: '#FFFFFF' }); } );
  this.playButton.setDepth(menuTextDepth);
  this.mainMenu.add(this.playButton);

  cam.setBounds(0, 0, bg.displayWidth, bg.displayHeight);
  this.physics.world.setBounds(0, 0, bg.displayWidth, bg.displayHeight);

  this.socket.on('currentPlayers', function (players) {
    
    if (!startedPlaying) {

      //add scoreboard background
      graphics = self.add.graphics();
      graphics.setDepth(-1000);
      graphics.fillStyle(0x000000, 0.5);
      graphics.fillRoundedRect(8, 8, 200, 400, 8);
      graphics.setScrollFactor(0);
      graphics.setDepth(menuBgDepth);

      //add scoreboard text
      self.scoreText = self.add.text(20, 20, '', { fontFamily: 'Roboto', fontSize: '32px', fill: '#FFFFFF'});
      self.scoreText.setScrollFactor(0);
      self.scoreText.setDepth(menuTextDepth);

      self.seperator = self.add.text(20, 38, '_____________', { fontFamily: 'Roboto', fontSize: '32px', fill: '#FFFFFF'});
      self.seperator.setScrollFactor(0);
      self.seperator.setDepth(menuTextDepth);

      self.otherScoresText = self.add.text(20, 78, '', { fontFamily: 'Roboto', fontSize: '32px', fill: '#FFFFFF'});
      self.otherScoresText.setScrollFactor(0);
      self.otherScoresText.setDepth(menuTextDepth);

      startedPlaying = true;
    }

    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
        cam.startFollow(self.ship);
        self.ship.setCollideWorldBounds(true);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });

  this.socket.on('disconnect', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.socket.on('playerMoved', function(playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.cursors = this.input.keyboard.createCursorKeys();

  this.socket.on('scoreUpdate', function (players) {
    self.scoreText.setText('SCORE: ' + players[self.socket.id].score);
    var scores = new Array();
    var playerList = Object.values(players);

    for (i = 0; i < playerList.length; i++) {
      scores.push(playerList[i].score);
    }

    scores.sort(function(a, b){return b-a});

    var topScores = "";
    var topScoreCount = -1;

    if (playerList.length >= 10) {
      topScoreCount = 10;
    } else {
      topScoreCount = playerList.length;
    }

    for (i = 0; i < topScoreCount; i++) {
      topScores += (i+1) + ". " + scores[i] + "\n";
    }

    self.otherScoresText.setText(topScores);
  });

  this.socket.on('starLocation', function (starLocations, maxStars) {

    for (i = 0; i < maxStars; i++) {
      if (self.stars[i]) self.stars[i].destroy();
      self.stars[i] = self.physics.add.image(starLocations[i].x, starLocations[i].y, 'star');
      self.starColliders.add(self.stars[i]);
    }

    var collider = self.physics.add.overlap(self.ship, self.starColliders, scoring, null, self);
      
    function scoring (player, star) {
      this.socket.emit('starCollected', star);
      collider.active = false;
    }
  });

}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  self.ship.setDepth(gameObjectDepth);

  if (playerInfo.team === 'blue') {
    self.ship.setTint(BLUE);
  } else {
    self.ship.setTint(RED);
  }

  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);

  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(BLUE);
  } else {
    otherPlayer.setTint(RED);
  }

  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}

function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }

    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
    } else {
      this.ship.setAcceleration(0);
    }

    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;

    if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
      this.socket.emit('playerMovement', {
        x: this.ship.x,
        y: this.ship.y,
        rotation: this.ship.rotation
      });
    }

    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation
    };
  }
}