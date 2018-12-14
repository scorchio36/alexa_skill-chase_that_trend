/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const randomGreetings = require('./random_greetings.json');
const SearchTermsGenerator = require('./search_terms_generator.js');
const searchTermsGenerator = new SearchTermsGenerator();

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
      speechText += "That is incorrect. I'm sorry. Game Over. Your final score is " + sessionAttributes.currentScore;
      repromptText += "I'm sorry. Game Over."
      screenOptions += "Game Over."
      sessionAttributes.gameActive = false;

      //handle game over
    }

    //save session variable changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      //.withSimpleCard('Which of these two have been searched more?', screenOptions)
      .getResponse();
  }
}
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

//I want to move the code that asks users the question in PlayGameHandler and AnswerHandler into this
//function to DRY up code. Haven't figured out a good way to organize it yet so putting a pin in it.
//Leaving this here as a reminder to fix it later.
/*async function askUserNewQuestion(searchTermsGenerator) {

}*/


const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayGameHandler,
    AnswerHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('chase-that-trend-user-data')
  .withAutoCreateTable(true)
  .lambda();
