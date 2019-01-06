const NAME_INDEX = 0;
const SCORE_INDEX = 1;

function Leaderboard(length, object) {

  console.log("OBJECT:" + object);

  if(object==undefined) {

    this.board = [];
    //this.board = [["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0], ["", 0]];
    for(var i = 0; i<length; i++) {
      this.board.push(["", 0]);
    }
  }
  else {
    Object.assign(this, object); //copy constructor for object
  }

}

//Copy-constructor for object
/*function Leaderboard(object) {
  object && Object.assign(this, object); //The && makes sure that object is not null
}*/

//returns a position if the score makes the list and -1 if new score is too low
Leaderboard.prototype.isScoreHighEnough = function(score) {
  console.log("Is score high enough has been run");
  for(var i = 0; i<this.board.length; i++) {
    if(score>this.board[i][SCORE_INDEX])
      return i;
    else
      continue;
  }

  return -1;
}

//add a name to a certain position
Leaderboard.prototype.addNameToPosition = function(name, position) {
  this.board[position][NAME_INDEX] = name;
}

//add a score to a certain position
Leaderboard.prototype.addScoreToPosition = function(score, position) {
  this.board[position][SCORE_INDEX] = score;
}

Leaderboard.prototype.getNameFromPosition = function(position) {
  return this.board[position][NAME_INDEX];
}

Leaderboard.prototype.getScoreFromPosition = function(position) {
  return this.board[position][SCORE_INDEX];
}

Leaderboard.prototype.getBoard = function() {
  return this.board;
}

//return an array of all the user's "places" on the leaderboard
Leaderboard.prototype.getPositionFromName = function(name) {

  //startingIndex changes to allow indexOf() to search rest of array for
  //repeated names

  //extract the names from the board
  var names = [];
  for(var i = 0; i<this.board.length; i++) {
    names.push(this.board[i][NAME_INDEX]);
  }

  console.log("1:" + JSON.stringify(names));

  let startingIndex = 0;
  let foundPositions = [];

  //indexOf returns -1 when name is not found
  while(names.indexOf(name, startingIndex) != -1) {
    let foundPosition = names.indexOf(name, startingIndex);
    startingIndex = foundPosition+1;
    foundPositions.push(foundPosition);
  }

  return foundPositions;
}

module.exports = Leaderboard;
