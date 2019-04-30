const TERRIBLE_SCORE_LIMIT = 300;
const MEDIUM_SCORE_LIMIT = 800;
const GOOD_SCORE_LIMIT = 1400;
const GREAT_SCORE_LIMIT = 2500;
const LEGENDARY_SCORE_LIMIT = 3500;

function VariedResponse() {

  this.skillOpenedResponses = ["Welcome back to Chase that Trend! ",
                               "Back for more eh? Let's play! ",
                               "Hey, you're back! Let's play Chase that Trend! ",
                               "Let's chase that trend! ",
                               "Welcome back. Think you can get a highscore this time? ",
                               "Welcome back. Let's see how far you can get this time. ",
                               "Good thing you're back. I think someone was trying to beat your highscore. ",
                               "Welcome back to Chase that Trend! You've got some highscores to get! ",
                               "It's time to chase that trend! You got this! ",
                               "I see you're back for more. Good luck! ",
                               "Chase that Trend! I love this game! ",
                               "You're back! Let's get some highscores. ",
                               "Welcome back! I hope you can get a highscore this time. ",
                               "Back to play some more Chase that Trend huh? Let's see what you got. ",
                               "Boy am I glad to see you. Let's play some Chase that Trend! "];


  this.newGameResponses = ["A new game and a new chance at some high scores. ",
                            "I have a good feeling about this round. Let's play. ",
                            "Time to get your guessing face on. ",
                            "This round will be even better than last round. ",
                            "Let's try to get on the leaderboards this time. ",
                            "New game? You got this. ",
                            "Focus up. Time for a new game. ",
                            "I was hoping you'd say that. Let's play! ",
                            "Let's do this! High scores here we come. ",
                            "This game is easy. Just say all the right answers. ",
                            "You are going to do awesome this round! Let's play. ",
                            "Let's play smarty pants. ",
                            "Time to make some good guesses. Let's play. ",
                            "First find the trends. Then start chasing. It's that easy. Let's play! ",
                            "Alright. Let's play the game! "];


    this.correctAnswerResponses = ["That is correct! Nice guess! ",
                          "That's right! Nice Guess! ",
                          "Wow nice guess. That's right. ",
                          "That is correct. ",
                          "Yup. That's it. ",
                          "Good guess. That's right. ",
                          "Yup that's right. ",
                          "Correct. Good guess. ",
                          "Correct. Keep it up. ",
                          "Awesome guess! ",
                          "Alright! Good guess! ",
                          "That's it. Good job. ",
                          "Wow you're a natural. ",
                          "Correct. You're moving on! ",
                          "Correct. Guess who's moving on! "];


    this.leaderboardScoreAchieved = ["What a champ! ",
                                     "You are too good buddy. ",
                                     "I wish I was as cool as you. ",
                                     "I wish I was that cool. ",
                                     "You are so awesome. Champion! ",
                                     "Way to make on the leaderboard! ",
                                     "What a beast. ",
                                     "That's what I'm talking about. ",
                                     "You got a high score! Yay! ",
                                     "That is so crazy. What a beast. ",
                                     "You are officially on the board. ",
                                     "Smells like champion in here. ",
                                     "Nice going buddy. ",
                                     "Man I wish I was that good. ",
                                     "I knew you could do it! ",
                                     "You just rocked Chase that trend! ",
                                     "You rock! ",
                                     "What a trend chaser. ",
                                     "Wow you are amazing. ",
                                     "Can I have your autograph? ",
                                     "How are you so good at this game? "];

    //Scores from 100 to 300
    this.terribleScoreResponses = ["Jeez that was sad. ",
                                   "Man you got out fast. ",
                                   "I think my grandmother could guess better than that. ",
                                   "Have you even been on the internet?",
                                   "Try spending a little more time on the internet. ",
                                   "No offense but that round was terrible. ",
                                   "You're looking for the term that was searched the most. Not the least silly. ",
                                   "That was a rough round. Sorry. ",
                                   "Not going to lie. You didn't do so hot that round. ",
                                   "Not the best guesser, are you?",
                                   "Try to guess a little better next time. ",
                                   "It's already over? Jeez you just started the game. ",
                                   "Oh man that was it? How embarrassing. ",
                                   "If you start another round quickly no one will have to hear your terrible score. ",
                                   "I really think you can do better than that. "];

    //400 to 800
    this.mediumScoreResponses = ["Wow that was not a bad round. Nice going. ",
                                 "Not bad bud. Not a bad round at all. ",
                                 "You must have played this game before. You're pretty good. ",
                                 "Nice guessing. You could definitely do better though. ",
                                 "Wow you're better than average. Try guessing a little better and you'll be on top. ",
                                 "Nobody likes second place. You gotta keep that high score for yourself. ",
                                 "If you keep trying you will definitely be on top. ",
                                 "Nice guessing. That was pretty good. ",
                                 "I've seen better guessing, but that wasn't too bad. ",
                                 "Most people don't guess this well so nice job. ",
                                 "I see you have spent a little time on the internet. ",
                                 "Guess a little better next time and you can make it to the top of the pack. ",
                                 "You impressed me a little bit. Nice job. I bet you can do even better. ",
                                 "Maybe you have a future career in chasing trends. ",
                                 "You could have a future career in guessing if you wanted. "];

    //900 to 1400
    this.goodScoreResponses = ["Now we are getting somewhere. Nice going. ",
                               "You are way better than a lot of people at this game. ",
                               "You must spend a lot of time guessing. That was a great round. ",
                               "You must spend a lot of time on the internet. That was an awesome round. ",
                               "Whoa we have a great guesser in the house. ",
                               "That was actually a really good round. ",
                               "That was way higher than so many people in the world. ",
                               "Wow you are terrible at this game. Terribly good. I'm impressed. ",
                               "That is a dang good score buddy. ",
                               "You should be proud of that score. It's a good one. ",
                               "Not many people can guess that many trends correctly so many times. ",
                               "That was some really solid guessing on your part. Nice round. ",
                               "That was a really good round. You should be proud of that score. ",
                               "Have you played this game a lot? You are really good. ",
                               "Not many people can score this many points in a round. I'm impressed. "];


    //1500 to 2500
    this.greatScoreResponses = ["I don't know what to say. Not many people can score this well",
                                "You are definitely at the top of the pack. That was some good guessing. ",
                                "How can you be this good at this game?",
                                "You are a fantastic guesser. ",
                                "That was some amazing guessing. What a score. ",
                                "That was a fantastic round. Nice score buddy. ",
                                "I don't really get to see score this good that often. ",
                                "I have no idea how you were able to guess so many correct answers. ",
                                "You are a chase that trend pro. ",
                                "You are definitely a pro. That was a crazy good round of guessing. ",
                                "You cheated. There is no way you are this good at this game. What a score. ",
                                "Do you have all the answers in front of you? How did you get so many correct?",
                                "I got to tell you. Not many people can play this game as well as you can. "];


      //2500 to 3500
      this.legendaryScoreResponses = ["The kid who programmed me didn't even think anyone would make it this far. ",
                                      "You are an absolute chase that trend legend. I can't remember the last person that did this well. ",
                                      "A god. A guessing god. That is what you are my friend. Your score is untouchable. ",
                                      "I haven't seen a score this good. In like. Ever. You are incredible at this game. ",
                                      "How can you have guess that many trends correctly? That is impossible. Your score is incredible. ",
                                      "I am flabbergasted right now. The kid who programmed me even thought that nobody could get a score as good as yours. "];


}


VariedResponse.prototype.getRandomSkillOpenedResponse = function() {
  return getRandomResponse(this.skillOpenedResponses);
}

VariedResponse.prototype.getRandomNewGameResponse = function() {
  return getRandomResponse(this.newGameResponses);
}

VariedResponse.prototype.getRandomCorrectAnswerResponse = function() {
  return getRandomResponse(this.correctAnswerResponses);
}

VariedResponse.prototype.getRandomLeaderboardScoreAchievedResponse = function() {
  return getRandomResponse(this.leaderboardScoreAchieved);
}

VariedResponse.prototype.getRandomReactionToScoreResponse = function(score) {

  if(score<TERRIBLE_SCORE_LIMIT) {
    return getRandomResponse(this.terribleScoreResponses);
  }
  else if(score>TERRIBLE_SCORE_LIMIT && score<MEDIUM_SCORE_LIMIT) {
    return getRandomResponse(this.mediumScoreResponses);
  }
  else if(score>MEDIUM_SCORE_LIMIT && score<GOOD_SCORE_LIMIT) {
    return getRandomResponse(this.goodScoreResponses);
  }
  else if(score>GOOD_SCORE_LIMIT && score<GREAT_SCORE_LIMIT) {
    return getRandomResponse(this.greatScoreResponses);
  }
  else if(score>GREAT_SCORE_LIMIT && score<LEGENDARY_SCORE_LIMIT) {
    return getRandomResponse(this.legendaryScoreResponses);
  }
  else {
    return "Chase that trend is really fun! ";
  }

}

//Accepts an array and returns a random response string within the array
function getRandomResponse(responsesArray) {
  return responsesArray[Math.floor(Math.random()*(responsesArray.length))];
}

module.exports = VariedResponse;
