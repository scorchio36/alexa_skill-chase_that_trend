/*

Note:

-World leaderboard must be grabbed everytime you want to use it so that the
current user has the most fresh leaderboard (so there won't be any overlap
problems since other Alexas will also be writing to this table).
*/

const Alexa = require('ask-sdk');
const randomGreetings = require('./random_greetings.json');
const SearchTermsGenerator = require('./search_terms_generator.js');
const searchTermsGenerator = new SearchTermsGenerator();
const Leaderboard = require('./leaderboard.js');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');

//Add an enum to keep track of states
const StateEnum = {"MAIN_MENU":0, "LEADERBOARD_MENU":1, "LOCAL_LEADERBOARD":2, "WORLD_LEADERBOARD":3,
                    "GAME_ACTIVE":4, "GAME_OVER":5};
//StatesEnum = Object.freeze(StatesEnum); //it is common practice to freeze the enum object after it is defined


//Create another DynamoDB persistence adapter object to get data from
//the table storing the worldwide leaderboard scores.
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({ tableName : 'chase_that_trend_US_leaderboard',
                                                                    partitionKeyGenerator : () => "1" });

const GAME_MENU_PROMPT = "Would you like to play the game, look at the leaderboards, or learn how to play? ";

const LOCAL_LEADERBOARD_LENGTH = 10;
const WORLD_LEADERBOARD_LENGTH = 50;


const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    await setupSkill(handlerInput);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if(sessionAttributes.firstTime) {
      //Prompt the user for the first time.
      speechText += "Welcome to Chase that Trend! The game where you try and guess which of two topics ";
      speechText += "are trending more than the other on the internet. ";
      speechText += GAME_MENU_PROMPT;
    }
    else {
      speechText += getRandomGreeting() + GAME_MENU_PROMPT;
    }

    repromptText += GAME_MENU_PROMPT;

    let attribs = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
    console.log("Outputting World");
    console.log("Worldwide leaderboard in DB: " + JSON.stringify(new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(attribs.leaderboard))));

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard('Chase that Trend!', GAME_MENU_PROMPT)
      .getResponse();
  },
};

const ShowLeaderboardsToUserHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "ShowLeaderboardsToUserIntent"
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.MAIN_MENU;
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state = StateEnum.LEADERBOARD_MENU;

    speechText += "Would you like to view your local Alexa's leaderboard or ";
    speechText += "the worldwide leaderboard? ";

    speechText += "You can also say main menu if you don't want to look at ";
    speechText += "leaderboards anymore. ";

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
}

const ShowLocalLeaderboardToUserHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "ShowLocalLeaderboardToUserIntent"
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.LEADERBOARD_MENU;
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state = StateEnum.LOCAL_LEADERBOARD;

    speechText += "To see a certain position on the board, say show me position ";
    speechText += "followed by the place number. To see if a name is on the board, ";
    speechText += "say show me the name followed by the name you want to look up. ";

    speechText += "You can also say main menu if you don't want to look at ";
    speechText += "leaderboards anymore. ";

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
}

const ShowWorldLeaderboardToUserHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "ShowWorldLeaderboardToUserIntent"
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.LEADERBOARD_MENU;
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state = StateEnum.WORLD_LEADERBOARD;

    speechText += "To see a certain position on the board, say show me position ";
    speechText += "followed by the place number. To see all names on this Alexa that ";
    speechText += "have made it onto the worldwide leaderboard, say see all names. "

    speechText += "You can also say main menu if you don't want to look at ";
    speechText += "leaderboards anymore. ";

    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
}

const ViewLeaderboardPositionHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "ViewLeaderboardPositionIntent"
    && (handlerInput.attributesManager.getSessionAttributes().state == StateEnum.LOCAL_LEADERBOARD ||
        handlerInput.attributesManager.getSessionAttributes().state == StateEnum.WORLD_LEADERBOARD);
  },
  async handle(handlerInput) {

    //shouldn't be able to call this handler in middle of game
    let activeGameCheck = checkForActiveGame(handlerInput);
    if(activeGameCheck) {
      return activeGameCheck;
    }

    let speechText = "";
    let repromptText = "";

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    //get the position that the user wants to see (slot value)
    let leaderboardPosition = handlerInput.requestEnvelope.request.intent.slots.leaderboardPosition.value;


    //Check if the user wants to look at a position within the local or world
    //leaderboard by looking at the current state.
    if(sessionAttributes.state == StateEnum.LOCAL_LEADERBOARD) {
      let localLeaderboard = sessionAttributes.localAlexaLeaderboard;
      localLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(localLeaderboard));

      //handle out of bounds leaderboard position
      if(leaderboardPosition > LOCAL_LEADERBOARD_LENGTH || leaderboardPosition < 1) {
        speechText += "I am sorry. The local leaderboard only goes up to position 10, or ";
        speechText += "10th place. ";
      }
      //Handle the case when no score has yet been achieved at the requested position
      else if(localLeaderboard.getScoreFromPosition(leaderboardPosition-1) == 0) {
        speechText += "There is currently no high score at that position. ";
      }
      //handle within-bounds leaderboard position
      else {
        speechText += localLeaderboard.getNameFromPosition(+leaderboardPosition-1) + " ";
        speechText += "is in " + leaderboardPosition + "th place with a score of ";
        speechText += localLeaderboard.getScoreFromPosition(+leaderboardPosition-1) + ". ";
      }


      speechText += "To see a certain position on the board, say show me position ";
      speechText += "followed by the place number. To see if a name is on the board, ";
      speechText += "say show me the name followed by the name you want to look up. ";

      speechText += "You can also say main menu if you don't want to look at ";
      speechText += "leaderboards anymore. ";

    }
    else if(sessionAttributes.state == StateEnum.WORLD_LEADERBOARD) {
      let dBAttributes = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
      let worldLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(dBAttributes.leaderboard));

      //handle out of bounds leaderboard position
      if(leaderboardPosition > LOCAL_LEADERBOARD_LENGTH || leaderboardPosition < 1) {
        speechText += "I am sorry. The leaderboard only goes up to position 10, or ";
        speechText += "10th place. ";
      }
      //Handle the case when no score has yet been achieved at the requested position
      else if(worldLeaderboard.getScoreFromPosition(leaderboardPosition-1) == 0) {
        speechText += "There is currently no high score at that position. ";
      }
      //handle within-bounds leaderboard position
      else {
        speechText += worldLeaderboard.getNameFromPosition(+leaderboardPosition-1) + " ";
        speechText += "is in " + (leaderboardPosition) + "th place with a score of ";
        speechText += worldLeaderboard.getScoreFromPosition(+leaderboardPosition-1) + ". ";
      }


      speechText += "To see a certain position on the board, say show me position ";
      speechText += "followed by the place number. To see all names on this Alexa that ";
      speechText += "have made it onto the worldwide leaderboard, say see all names. "

      speechText += "You can also say main menu if you don't want to look at ";
      speechText += "leaderboards anymore. ";
    }

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
}

const HowToPlayHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "HowToPlayIntent"
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.MAIN_MENU;
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    speechText+= "Chase that Trend is a guessing game where you try to guess ";
    speechText+= "which two topics are trending more on the internet. Each round, ";
    speechText+= "you will be given two random search terms from a variety of categories. ";
    speechText+= "All you have to do is say which search term you think has been searched ";
    speechText+= "more times over the past month. If you guess correctly, you will increase ";
    speechText+= "your score and receive another set of search terms. The game will end when ";
    speechText+= "you guess incorrectly. If your score is high enough you will be able to ";
    speechText+= "have your name on your Alexa's high score leaderboard. And if it's really good, ";
    speechText+= "you might even be able to make it onto the global high score leaderboard. ";
    speechText+= "That's all you need to know to play. Good luck! ";

    speechText+= GAME_MENU_PROMPT;
    repromptText+= GAME_MENU_PROMPT;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
}

const PlayGameHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'PlayGameIntent'
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.MAIN_MENU;
  },
  async handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    //handles the case when user skips past Launch Handler
    await setupSkill(handlerInput);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.gameActive = true;
    sessionAttributes.state = StateEnum.GAME_ACTIVE;

    speechText += "Alright. Let's play the game! ";
    speechText += "I will give you two random things that were searched on the internet. ";
    speechText += "All you have to do is tell me, over the past month, which of the two ";
    speechText += "things has been searched more? ";

    await searchTermsGenerator.shuffleSearchTerms();
    let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();
    let currentGrades = searchTermsGenerator.getCurrentGrades();

    speechText += "Your two search terms are " + currentSearchTerms[0];
    speechText += " and " + currentSearchTerms[1] + ". Which of these terms has been searched more?";

    repromptText += "Which of these two search terms have been searched more? ";
    repromptText += currentSearchTerms[0] + " or " + currentSearchTerms[1] + " ?";

    let screenOptions = "" + currentSearchTerms[0] + " or " + currentSearchTerms[1];

    //save search terms and grades to the current session (so it can be used by other intents)

    //save session changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Which of these two have been searched more?', screenOptions)
      .withShouldEndSession(false)
      .getResponse();
  },
};

const AnswerHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent'
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.GAME_ACTIVE; //shouldnt run if game is not active
  },
  async handle(handlerInput) {

    //setup AnswerHandler text output
    let speechText = "";
    let repromptText = "";
    let screenOptions = "";

    //get the user's answer (slot value)
    let userAnswer = handlerInput.requestEnvelope.request.intent.slots.userAnswer.value;

    //get the variables stored in the current session
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    //get the persistent attributes since we need to save the local leaderboard at the end of the game
    const persistentAttributes = handlerInput.attributesManager.getPersistentAttributes();

    let localLeaderboard = sessionAttributes.localAlexaLeaderboard;
    localLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(localLeaderboard));
    console.log("LEADERBOARD:" + localLeaderboard.constructor.name);

    //grab the World Leaderboard
    let dBAttributes = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
    let worldLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(dBAttributes.leaderboard));

    //log results to double check that user answer is lining up with correct answer
    console.log("UserAnswer:" + userAnswer);
    console.log("Winning Answer:" + searchTermsGenerator.getWinningSearchTerm());

    //check if the user's answer is correct
    if((userAnswer.toLowerCase().trim()) == (searchTermsGenerator.getWinningSearchTerm().toLowerCase().trim())) {

      //handler correct answer
      speechText += "That is correct! Nice guess! "; //Update this later to be random congratz saying
      sessionAttributes.currentScore += 100; //keep the added score at 100 for now

      //ask the user the next question and update the search terms
      await searchTermsGenerator.shuffleSearchTerms();
      let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();
      let currentGrades = searchTermsGenerator.getCurrentGrades();

      speechText += "Your two search terms are " + currentSearchTerms[0];
      speechText += " and " + currentSearchTerms[1] + ". Which of these terms has been searched more?";

      repromptText += "Which of these two search terms have been searched more? ";
      repromptText += currentSearchTerms[0] + " or " + currentSearchTerms[1] + "? ";

      screenOptions = "" + currentSearchTerms[0] + " or " + currentSearchTerms[1];

    }
    else {

      //handle incorrect answer
      speechText += "That is incorrect. I'm sorry. Game Over. Your final score is " + sessionAttributes.currentScore + ". ";
      repromptText += "I'm sorry. Game Over. ";
      screenOptions += "Game Over. ";

      //handle game over
      sessionAttributes.state = StateEnum.GAME_OVER;
      //check if the user made it on either score board
      let localScorePosition = localLeaderboard.isScoreHighEnough(sessionAttributes.currentScore);
      let isLocalScoreHighEnough = (localScorePosition != -1);

      let worldScorePosition = worldLeaderboard.isScoreHighEnough(sessionAttributes.currentScore);
      let isWorldScoreHighEnough = (worldScorePosition != -1);

      if(isLocalScoreHighEnough && isWorldScoreHighEnough) {
        localLeaderboard.addScoreToPosition(sessionAttributes.currentScore, localScorePosition);
        localLeaderboard.addNameToPosition(handlerInput.requestEnvelope.session.user.userId, localScorePosition);
        worldLeaderboard.addScoreToPosition(sessionAttributes.currentScore, worldScorePosition);
        worldLeaderboard.addNameToPosition(handlerInput.requestEnvelope.session.user.userId, worldScorePosition);

        speechText += "Congratulations! You got a high score on your Alexa leaderboard and made it on the Worldwide score board! What is your name? ";
      }
      else if(isLocalScoreHighEnough && !isWorldScoreHighEnough) {
        localLeaderboard.addScoreToPosition(sessionAttributes.currentScore, localScorePosition);
        localLeaderboard.addNameToPosition(handlerInput.requestEnvelope.session.user.userId, localScorePosition);

        speechText += "Congratulations! You got a high score on your Alexa leaderboard! What is your name? ";
      }
      else if(!isLocalScoreHighEnough && isWorldScoreHighEnough) {
        worldLeaderboard.addScoreToPosition(sessionAttributes.currentScore, worldScorePosition);
        worldLeaderboard.addNameToPosition(handlerInput.requestEnvelope.session.user.userId, worldScorePosition);

        speechText += "Congratulations! You made it on the Worldwide score board! What is your name? ";
      }
      else {
        speechText += "I am sorry. But you did not qualify for a high score. Better luck next time! ";
        speechText += GAME_MENU_PROMPT;

        sessionAttributes.currentScore = 0;
        sessionAttributes.state = StateEnum.MAIN_MENU;
        sessionAttributes.gameActive = false;
      }
    }


    sessionAttributes.localAlexaLeaderboard = JSON.stringify(localLeaderboard);
    //save session variable changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    //save DB changes
    dBAttributes.leaderboard = JSON.stringify(worldLeaderboard);
    await dynamoDbPersistenceAdapter.saveAttributes(handlerInput.requestEnvelope, dBAttributes);

    persistentAttributes.localAlexaLeaderboard = sessionAttributes.localAlexaLeaderboard;
    handlerInput.attributesManager.setPersistentAttributes(persistentAttributes);
    await handlerInput.attributesManager.savePersistentAttributes();

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      //.withSimpleCard('Which of these two have been searched more?', screenOptions)
      .getResponse();
  },
};

const MainMenuHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'MainMenuIntent'
    && handlerInput.attributesManager.getSessionAttributes().state != StateEnum.GAME_ACTIVE
    && handlerInput.attributesManager.getSessionAttributes().state != StateEnum.GAME_OVER;
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state = StateEnum.MAIN_MENU;

    speechText += GAME_MENU_PROMPT;
    repromptText += GAME_MENU_PROMPT;

    //save session changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard("Chase that Trend!", GAME_MENU_PROMPT)
      .withShouldEndSession(false)
      .getResponse();
  },
}

//After a user gets a high score, they should say a name to store the score under
const GetUserNameHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'GetUserNameIntent'
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.GAME_OVER;
  },
  async handle(handlerInput) {
    //setup AnswerHandler text output
    let speechText = "";
    let repromptText = "";

    //get the user's answer (slot value)
    let userName = handlerInput.requestEnvelope.request.intent.slots.userName.value;

    //get the variables stored in the current session
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const persistentAttributes = handlerInput.attributesManager.getPersistentAttributes();

    //get the leaderboards
    let localLeaderboard = sessionAttributes.localAlexaLeaderboard;
    localLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(localLeaderboard));

    let dBAttributes = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
    let worldLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(dBAttributes.leaderboard));

    //check if the user made it on either score board
    let localScorePosition = localLeaderboard.getPositionFromName(handlerInput.requestEnvelope.session.user.userId);
    let isNameInLocalLeaderboard = (localScorePosition != -1);

    let worldScorePosition = worldLeaderboard.getPositionFromName(handlerInput.requestEnvelope.session.user.userId);
    let isNameInWorldLeaderboard = (worldScorePosition != -1);


    if(isNameInLocalLeaderboard && isNameInWorldLeaderboard) {
      localLeaderboard.addNameToPosition(userName, localScorePosition);
      worldLeaderboard.addNameToPosition(userName, worldScorePosition);

      speechText += "Great job " + userName + ". Your score made " + (+localScorePosition+1) + "th place on your Alexa. ";
      speechText += "and " + (+worldScorePosition+1) + "th place in the world! ";
    }
    else if(isNameInLocalLeaderboard && !isNameInWorldLeaderboard) {
      localLeaderboard.addNameToPosition(userName, localScorePosition);

      speechText += "Great job " + userName + ". Your score made " + (+localScorePosition+1) + "th place on your Alexa. ";
    }
    else if(!isNameInLocalLeaderboard && isNameInWorldLeaderboard) {
      worldLeaderboard.addNameToPosition(userName, worldScorePosition);

      speechText += "Great job " + userName + ". Your score made " + (+worldScorePosition+1) + "th place in the world. ";
    }


    sessionAttributes.state = StateEnum.MAIN_MENU;
    speechText += "I wish I was that cool. ";
    speechText += GAME_MENU_PROMPT;

    sessionAttributes.localAlexaLeaderboard = JSON.stringify(localLeaderboard);
    //save session variable changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    //save DB changes
    dBAttributes.leaderboard = JSON.stringify(worldLeaderboard);
    await dynamoDbPersistenceAdapter.saveAttributes(handlerInput.requestEnvelope, dBAttributes);

    persistentAttributes.localAlexaLeaderboard = sessionAttributes.localAlexaLeaderboard;
    handlerInput.attributesManager.setPersistentAttributes(persistentAttributes);
    await handlerInput.attributesManager.savePersistentAttributes();

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      //.withSimpleCard('Which of these two have been searched more?', screenOptions)
      .getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say hello to me!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Hello World', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const DefaultHandler = {

  canHandle(handlerInput) {
    return true;
  },
  handle(handlerInput) {

    //If Alexa doesn't know what to do, then the other handlers might
    //have failed a state protection check because a game is currently
    //active. Check if the game is active here and respond accordingly.
    let activeGameCheck = checkForActiveGame(handlerInput);
    if(activeGameCheck) {
      return activeGameCheck;
    }
  },

}

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};



//helper functions

//get a random greeting for when the user opens the skill
function getRandomGreeting() {
  const greetings = randomGreetings.greetings; //array filled with random greetings
  return greetings[Math.floor(Math.random()*(greetings.length))];
}

function checkForActiveGame(handlerInput) {

  let speechText = "";
  let repromptText = "";
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms(); //reprompt the user with answer choices

  if(sessionAttributes.state == StateEnum.GAME_ACTIVE) {

    speechText += "I am sorry. You can not run this command when you are ";
    speechText += "in the middle of a game. If you would like to exit the skill ";
    speechText += "just say quit. Otherwise, your two search terms are ";
    speechText += currentSearchTerms[0] + " and " + currentSearchTerms[1] + ". ";
    speechText += "Which of these was searched the most? ";
  }
  else if(sessionAttributes.state == StateEnum.GAME_OVER) {
    speechText += "I am sorry. You cannot run this command when you are ";
    speechText += "in the middle of a game. If you would like to exit the skill ";
    speechText += "just say quit. Otherwise, what is your name? ";
  }
  else {
    return; //There is no active game so just return from this function
  }

  //There is currently an active game (or a score is being saved) so provide the
  //user with the appropriate response.
  return handlerInput.responseBuilder
    .speak(speechText)
    .reprompt(repromptText)
    .withShouldEndSession(false)
    .getResponse();

}

//This function will take care of anything that needs to happen before the user
//begins interracting with the skill. This will be especially useful when
//dealing with one-shot intents (like if the user skips past the launcher and
//immediately asks to just play the game.)
async function setupSkill(handlerInput) {
  //store attributesManager in a variable so I don't have to keep calling it
  const attributesManager = handlerInput.attributesManager;

  //Retrieve the user data or initialize one if user data was not found.
  const persistentAttributes = await attributesManager.getPersistentAttributes() ||
  {};
  const sessionAttributes = attributesManager.getSessionAttributes() ||
  {};

  //Check if it is the user's first time opening the skill.
  if(Object.keys(persistentAttributes).length === 0) {

    //Initialize persistent attributes.
    persistentAttributes.localAlexaLeaderboard = JSON.stringify(new Leaderboard(LOCAL_LEADERBOARD_LENGTH, undefined)); //top highest local scores
    persistentAttributes.firstTime = true; //user's first time opening the skill?
    attributesManager.setPersistentAttributes(persistentAttributes);
    await attributesManager.savePersistentAttributes();
  }

  //Initialize the session attributes.
  sessionAttributes.currentScore = 0;
  sessionAttributes.gameActive = false;
  sessionAttributes.localAlexaLeaderboard = persistentAttributes.localAlexaLeaderboard;
  sessionAttributes.state = StateEnum.MAIN_MENU;
  console.log("setupSkill Leaderboard:" + sessionAttributes.localAlexaLeaderboard);

  sessionAttributes.firstTime = persistentAttributes.firstTime;
  attributesManager.setSessionAttributes(sessionAttributes);
}

//I want to move the code that asks users the question in PlayGameHandler and AnswerHandler into this
//function to DRY up code. Haven't figured out a good way to organize it yet so putting a pin in it.
//Leaving this here as a reminder to fix it later.
/*async function askUserNewQuestion(searchTermsGenerator) {

}*/


const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HowToPlayHandler,
    ShowLeaderboardsToUserHandler,
    ShowLocalLeaderboardToUserHandler,
    ShowWorldLeaderboardToUserHandler,
    ViewLeaderboardPositionHandler,
    PlayGameHandler,
    AnswerHandler,
    GetUserNameHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    MainMenuHandler,
    DefaultHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('chase-that-trend-user-data')
  .withAutoCreateTable(true)
  .lambda();
