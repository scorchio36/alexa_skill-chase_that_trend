const NAME_INDEX = 0; //name is stored in index 0 in the board array
const SCORE_INDEX = 1; //score is stored in index 1 of the board array

function Leaderboard(length, object) {

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
  for(var i = 0; i<this.board.length; i++) {
    if(score>this.board[i][SCORE_INDEX])
      return i;
    else
      continue;
  }

  return -1;
}

//add a name to a certain position
//Do not call this before addScoreToPosition has been called. This method
//must be called after because it depends on the splice done in the
//addScoreToPosition method.
Leaderboard.prototype.addNameToPosition = function(name, position) {
  this.board[position][NAME_INDEX] = name;
}

//add a score to a certain position
//Splice is used to insert a new entry in between the current entries
//rather than just writing over past entries.
Leaderboard.prototype.addScoreToPosition = function(score, position) {
  //this.board[position][SCORE_INDEX] = score;
  this.board.splice(position, 0, [this.board[position][NAME_INDEX], score]);
}

Leaderboard.prototype.getNameFromPosition = function(position) {
  return this.board[position][NAME_INDEX];
}

Leaderboard.prototype.getScoreFromPosition = function(position) {
  return this.board[position][SCORE_INDEX];
}

//remove an entire entry from this position
Leaderboard.prototype.removeEntryAtPosition = function(position) {
  this.board.splice(position, 1);
}

Leaderboard.prototype.removeLastEntry = function(position) {
  this.board.pop();
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
