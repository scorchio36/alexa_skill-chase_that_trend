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

//Create another DynamoDB persistence adapter object to get data from
//the table storing the worldwide leaderboard scores.
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({ tableName : 'chase_that_trend_US_leaderboard',
                                                                    partitionKeyGenerator : () => "1" });

const GAME_MENU_PROMPT = "Would you like to play the game, look at the leaderboards, or learn how to play?";
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
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    speechText += "Would you like to view your local Alexa's leaderboard or ";
    speechText += "the worldwide leaderboard? ";

    speechText += "You can also say main menu if you don't want to look at ";
    speechText += "leaderboards anymore. ";

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
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    speechText += "To see a certain position on the board, say show me position ";
    speechText += "followed by the place number. To see if a name is on the board, ";
    speechText += "say show me the name followed by the name you want to look up. ";

    speechText += "You can also say main menu if you don't want to look at ";
    speechText += "leaderboards anymore. ";

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
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    speechText += "To see a certain position on the board, say show me position ";
    speechText += "followed by the place number. To see all names on this Alexa that ";
    speechText += "have made it onto the worldwide leaderboard, say see all names. "

    speechText += "You can also say main menu if you don't want to look at ";
    speechText += "leaderboards anymore. ";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
}

const HowToPlayHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest"
    && handlerInput.requestEnvelope.request.intent.name === "HowToPlayIntent";
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    speechText+= "Chase that Trend is a guessing game where you try to guess ";
    speechText+= "which two topics are trending more on the internet. Each round, ";
    speechText+= "you will be given two random search terms from a variety of categories. ";
    speechText+= "All you have to do is say which search term you think has been searched ";
    speechText+= "more times over the past month. If you guess correctly, you will increase ";
    speechText+= "you score and receive another set of search terms. The game will end when ";
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
    && handlerInput.requestEnvelope.request.intent.name === 'PlayGameIntent';
  },
  async handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

    //handles the case when user skips past Launch Handler
    await setupSkill(handlerInput);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.gameActive = true;

    speechText += "Alright. Let's play the game! ";
    speechText += "I will give you two random things that were searched on the internet. ";
    speechText += "All you have to do is tell me, over the past month, which of the two ";
    speechText += "things has been searched more? ";

    await searchTermsGenerator.shuffleSearchTerms();
    let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();
    let currentGrades = searchTermsGenerator.getCurrentGrades();

    speechText += "Your two search terms are " + currentSearchTerms[0];
    speechText += " and " + currentSearchTerms[1] + "Which of these terms has been searched more?";

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
    && handlerInput.attributesManager.getSessionAttributes().gameActive; //shouldnt run if game is not active
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
      speechText += "That is correct! Nice guess!"; //Update this later to be random congratz saying
      sessionAttributes.currentScore += 100; //keep the added score at 100 for now

      //ask the user the next question and update the search terms
      await searchTermsGenerator.shuffleSearchTerms();
      let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();
      let currentGrades = searchTermsGenerator.getCurrentGrades();

      speechText += "Your two search terms are " + currentSearchTerms[0];
      speechText += " and " + currentSearchTerms[1] + "Which of these terms has been searched more?";

      repromptText += "Which of these two search terms have been searched more? ";
      repromptText += currentSearchTerms[0] + " or " + currentSearchTerms[1] + " ?";

      screenOptions = "" + currentSearchTerms[0] + " or " + currentSearchTerms[1];

    }
    else {

      //handle incorrect answer
      speechText += "That is incorrect. I'm sorry. Game Over. Your final score is " + sessionAttributes.currentScore + ". ";
      repromptText += "I'm sorry. Game Over.";
      screenOptions += "Game Over.";

      //handle game over

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
        sessionAttributes.gameActive = false;
      }
    }


    sessionAttributes.localAlexaLeaderboard = JSON.stringify(localLeaderboard);
    //save session variable changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    //save DB changes
    dBAttributes.leaderboard = JSON.stringify(worldLeaderboard);
    await dynamoDbPersistenceAdapter.saveAttributes(handlerInput.requestEnvelope, dBAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      //.withSimpleCard('Which of these two have been searched more?', screenOptions)
      .getResponse();
  },
};

//After a user gets a high score, they should say a name to store the score under
const GetUserNameHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'GetUserNameIntent';
  },
  async handle(handlerInput) {
    //setup AnswerHandler text output
    let speechText = "";
    let repromptText = "";

    //get the user's answer (slot value)
    let userName = handlerInput.requestEnvelope.request.intent.slots.userName.value;

    //get the variables stored in the current session
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

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

      speechText += "Great job " + userName + ". Your score made " + localScorePosition + "th place on your Alexa. ";
      speechText += "and " + worldScorePosition + "th place in the world! ";
    }
    else if(isNameInLocalLeaderboard && !isNameInWorldLeaderboard) {
      localLeaderboard.addNameToPosition(userName, localScorePosition);

      speechText += "Great job " + userName + ". Your score made " + localScorePosition + "th place on your Alexa. ";
    }
    else if(!isNameInLocalLeaderboard && isNameInWorldLeaderboard) {
      worldLeaderboard.addNameToPosition(userName, worldScorePosition);

      speechText += "Great job " + userName + ". Your score made " + worldScorePosition + "th place in the world. ";
    }



    speechText += "I wish I was that cool. ";
    speechText += GAME_MENU_PROMPT;

    sessionAttributes.localAlexaLeaderboard = JSON.stringify(localLeaderboard);
    //save session variable changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    //save DB changes
    dBAttributes.leaderboard = JSON.stringify(worldLeaderboard);
    await dynamoDbPersistenceAdapter.saveAttributes(handlerInput.requestEnvelope, dBAttributes);

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

//This function will take care of anything that needs to happen before the user
//begins interracting with the skill. This will be especially useful when
//dealing with one-shot intents (like if the user skips past the launcher and
//immediately asks to just play the game.)
async function setupSkill(handlerInput) {
  //store attributesManager in a variable so I don't have to keep calling it
  const attributesManager = handlerInput.attributesManager;

  //Retrieve the user data or initialize one if user data was not found.
  const persistentAttributes = //await attributesManager.getPersistentAttributes() ||
  {};
  const sessionAttributes = //attributesManager.getSessionAttributes() ||
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
    PlayGameHandler,
    AnswerHandler,
    GetUserNameHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('chase-that-trend-user-data')
  .withAutoCreateTable(true)
  .lambda();
