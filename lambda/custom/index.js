/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const randomGreetings = require('./random_greetings.json');

const GAME_MENU_PROMPT = "Would you like to play the game, look at the leaderboards, or learn how to play?";

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {

    //Each user will have corresponding persitent attributes storing info
    //about the game.

    //store attributesManager in a variable so I don't have to keep calling it
    const attributesManager = handlerInput.attributesManager;

    //Retrieve the user data or initialize one if user data was not found.
    const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
    const sessionAttributes = attributesManager.getSessionAttributes() || {};


    //Check if it is the user's first time opening the skill.
    if(Object.keys(persistentAttributes).length === 0) {

      //Initialize persistent attributes.
      persistentAttributes.localAlexaLeaderboard = [0, 0, 0, 0, 0, 0, 0]; //top 7 highest local scores
      attributesManager.setPersistentAttributes(persistenAttributes);
      await attributesManager.savePersistentAttributes();

      //Prompt the user for the first time.
      speechText = "Welcome to Chase that Trend! The game where you try and guess which of two topics ";
      speechText += "are trending more than the other on the internet. ";
      speechText += GAME_MENU_PROMPT;
    }
    else {
      speechText = getRandomGreeting() + GAME_MENU_PROMPT;
    }

    //Initialize the session attributes.
    sessionAttributes.currentScore = 0;
    sessionAttributes.gameActive = false;
    sessionAttributes.localAlexaLeaderboard = persistentAttributes.localAlexaLeaderboard;
    attributesManager.setSessionAttributes(sessionAttributes);

    repromptSpeech = GAME_MENU_PROMPT;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard('Chase that Trend!', GAME_MENU_PROMPT);
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
function getRandomGreeting() {
  const greetings = randomGreetings.greetings; //array filled with random greetings
  return greetings[Math.floor(Math.random()*(greetings.length))];
}

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('chase-that-trend-user-data')
  .withAutoCreateTable(true)
  .lambda();
