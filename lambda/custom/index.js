/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const randomGreetings = require('./random_greetings.json');
const SearchTermsGenerator = require('./search_terms_generator.js');
let searchTermsGenerator = new SearchTermsGenerator();

const GAME_MENU_PROMPT = "Would you like to play the game, look at the leaderboards, or learn how to play?";

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

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withSimpleCard('Chase that Trend!', GAME_MENU_PROMPT)
      .getResponse();
  },
};

const PlayGameHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'PlayGameIntent';
  },
  async handle(handlerInput) {

    let speechText = "";
    let repromptText = "";

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

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Which of these two have been searched more?', screenOptions)
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
  const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
  const sessionAttributes = attributesManager.getSessionAttributes() || {};

  //Check if it is the user's first time opening the skill.
  if(Object.keys(persistentAttributes).length === 0) {

    //Initialize persistent attributes.
    persistentAttributes.localAlexaLeaderboard = [0, 0, 0, 0, 0, 0, 0]; //top 7 highest local scores
    persistentAttributes.firstTime = true; //user's first time opening the skill?
    attributesManager.setPersistentAttributes(persistentAttributes);
    await attributesManager.savePersistentAttributes();
  }

  //Initialize the session attributes.
  sessionAttributes.currentScore = 0;
  sessionAttributes.gameActive = false;
  sessionAttributes.localAlexaLeaderboard = persistentAttributes.localAlexaLeaderboard;
  sessionAttributes.firstTime = persistentAttributes.firstTime;
  attributesManager.setSessionAttributes(sessionAttributes);
}




const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayGameHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('chase-that-trend-user-data')
  .withAutoCreateTable(true)
  .lambda();
