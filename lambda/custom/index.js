/*

Note:

-World leaderboard must be grabbed everytime you want to use it so that the
current user has the most fresh leaderboard (so there won't be any overlap
problems since other Alexas will also be writing to this table).
*/

const Alexa = require('ask-sdk');
const VariedResponse = require('./varied_response.js');
const variedResponse = new VariedResponse();
const sounds = require('./sounds.json');
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
const LEADERBOARD_SEARCH_PROMPT = `To see a certain position on the board, say show me position
                                   followed by the place number. To see if a name is on the board,
                                   say show me the name followed by the name you want to look up.
                                   You can also say main menu if you don't want to look at leaderboards anymore. `;

const LOCAL_LEADERBOARD_LENGTH = 10;
const WORLD_LEADERBOARD_LENGTH = 10;
const POINTS_FOR_CORRECT_ANSWER = 100;



/*************Handlers****************/
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {

    let speechText = "";
    let repromptText = "";
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


    //cute intro sound for when user opens game up
    speechText += sounds.intro_sound;

    await setupSkill(handlerInput);

    if(sessionAttributes.firstTime) {
      //Prompt the user for the first time.
      speechText += "Welcome to Chase that Trend! The game where you try and guess which of two topics ";
      speechText += "are trending more than the other on the internet. ";
      speechText += GAME_MENU_PROMPT;
    }
    else {
      speechText += variedResponse.getRandomSkillOpenedResponse() + GAME_MENU_PROMPT;
    }

    repromptText += GAME_MENU_PROMPT;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      //.withSimpleCard('Chase that Trend!', GAME_MENU_PROMPT)
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

    speechText += LEADERBOARD_SEARCH_PROMPT;

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

    speechText += LEADERBOARD_SEARCH_PROMPT;

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
        speechText += "I am sorry. The local leaderboard only goes up to position ";
        speechText += LOCAL_LEADERBOARD_LENGTH + ", or 10th place. ";
      }
      //Handle the case when no score has yet been achieved at the requested position
      //The 1s in these conditionals handle the fact that leadeboardPosition is a place/position not an array index
      else if(localLeaderboard.getScoreFromPosition(leaderboardPosition-1) == 0) {
        speechText += "There is currently no high score at that position. ";
      }
      //handle within-bounds leaderboard position
      else {
        speechText += localLeaderboard.getNameFromPosition(+leaderboardPosition-1) + " ";
        speechText += "is in " + leaderboardPosition + "th place with a score of ";
        speechText += localLeaderboard.getScoreFromPosition(+leaderboardPosition-1) + ". ";
      }


      speechText += LEADERBOARD_SEARCH_PROMPT;

    }
    else if(sessionAttributes.state == StateEnum.WORLD_LEADERBOARD) {
      let dBAttributes = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
      let worldLeaderboard = new Leaderboard(WORLD_LEADERBOARD_LENGTH, JSON.parse(dBAttributes.leaderboard));

      //handle out of bounds leaderboard position
      if(leaderboardPosition > WORLD_LEADERBOARD_LENGTH || leaderboardPosition < 1) {
        speechText += "I am sorry. The world leaderboard only goes up to position ";
        speechText += WORLD_LEADERBOARD_LENGTH + ", or 10th place. ";
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


      speechText += LEADERBOARD_SEARCH_PROMPT;
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
    //await setupSkill(handlerInput);

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.state = StateEnum.GAME_ACTIVE;


    speechText += variedResponse.getRandomNewGameResponse();
    speechText += sounds.new_game_sound;
    if(!sessionAttributes.playAgain) {
      speechText += "I will give you two random things that were searched on the internet. ";
      speechText += "All you have to do is tell me, over the past month, which of the two ";
      speechText += "things has been searched more? ";
    }

    //Get the new search terms that will be provided to the user
    await searchTermsGenerator.shuffleSearchTerms();
    let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();

    speechText += "Your two search terms are " + currentSearchTerms[0];
    speechText += " and " + currentSearchTerms[1] + ". Which of these terms has been searched more?";

    repromptText += "Which of these two search terms have been searched more? ";
    repromptText += currentSearchTerms[0] + " or " + currentSearchTerms[1] + " ?";

    sessionAttributes.playAgain = true; //If the user decides to plays again, then the skill will know

    //save session changes
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
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

    //get the user's answer (slot value)
    let userAnswer = handlerInput.requestEnvelope.request.intent.slots.userAnswer.value;

    //get the variables stored in the current session
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    //get the persistent attributes since we need to save the local leaderboard at the end of the game
    const persistentAttributes = handlerInput.attributesManager.getPersistentAttributes();

    let localLeaderboard = sessionAttributes.localAlexaLeaderboard;
    localLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(localLeaderboard));

    //grab the World Leaderboard
    let dBAttributes = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
    let worldLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(dBAttributes.leaderboard));

    //The user has provided one of the valid answer choices
    if(validateUserAnswer(userAnswer)) {

      //check if the user's answer is correct
      if((userAnswer.toLowerCase().trim()) == (searchTermsGenerator.getWinningSearchTerm().toLowerCase().trim())) {

        //handler correct answer
        speechText += sounds.correct_answer_sound;
        speechText += variedResponse.getRandomCorrectAnswerResponse();
        sessionAttributes.currentScore += POINTS_FOR_CORRECT_ANSWER;

        //update the search terms and ask the user the next question
        await searchTermsGenerator.shuffleSearchTerms();
        let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();

        speechText += "Your two search terms are " + currentSearchTerms[0];
        speechText += " and " + currentSearchTerms[1] + ". Which of these terms has been searched more?";

        repromptText += "Which of these two search terms have been searched more? ";
        repromptText += currentSearchTerms[0] + " or " + currentSearchTerms[1] + "? ";

      }
      else {

        //handle incorrect answer
        speechText += sounds.wrong_answer_sound;
        speechText += "That is incorrect. I'm sorry. Game Over. ";
        speechText += sounds.game_over_sound;
        speechText += "Your final score is " + sessionAttributes.currentScore + ". ";
        speechText += variedResponse.getRandomReactionToScoreResponse(sessionAttributes.currentScore);
        repromptText += "I'm sorry. Game Over. ";

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

          speechText += sounds.high_score_sound;
          speechText += "Congratulations! You got a high score on your local Alexa leaderboard and made it on the Worldwide score board! What is your first name? ";
        }
        else if(isLocalScoreHighEnough && !isWorldScoreHighEnough) {
          localLeaderboard.addScoreToPosition(sessionAttributes.currentScore, localScorePosition);
          localLeaderboard.addNameToPosition(handlerInput.requestEnvelope.session.user.userId, localScorePosition);

          speechText += sounds.high_score_sound;
          speechText += "Congratulations! You got a high score on your local Alexa leaderboard! What is your first name? ";
        }
        else if(!isLocalScoreHighEnough && isWorldScoreHighEnough) {
          worldLeaderboard.addScoreToPosition(sessionAttributes.currentScore, worldScorePosition);
          worldLeaderboard.addNameToPosition(handlerInput.requestEnvelope.session.user.userId, worldScorePosition);

          speechText += sounds.high_score_sound;
          speechText += "Congratulations! You made it on the Worldwide score board! What is your first name? ";
        }
        else {
          speechText += "I am sorry. But you did not qualify for a high score. Better luck next time! ";
          speechText += GAME_MENU_PROMPT;

          sessionAttributes.currentScore = 0;
          sessionAttributes.state = StateEnum.MAIN_MENU;
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

    }

    //User answer does not match any of the answer choices
    else {

      let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();

      speechText += "Your answer does not match any of the answer choices I have given. ";
      speechText += "Please respond with one of the search terms I have provided. ";
      speechText += currentSearchTerms[0] + ". Or. " + currentSearchTerms[1] + ". ";
      //speechText += "If you are still saying them correctly, there must be something wrong with my system. ";
      //speechText += "If that is the case I apologize and you can exit the game by saying quit. "
    }
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
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
      .withShouldEndSession(false)
      .getResponse();
  },
}

const RepeatSearchTermsHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
    && handlerInput.requestEnvelope.request.intent.name === 'RepeatSearchTermsIntent'
    && handlerInput.attributesManager.getSessionAttributes().state == StateEnum.GAME_ACTIVE
  },
  handle(handlerInput) {

    let speechText = "";
    let repromptText = "";
    let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();

    speechText += "Your two search terms are " + currentSearchTerms[0] + ". ";
    speechText += "Or. " + currentSearchTerms[1] + ". Which of these terms has been searched more?";

    repromptText += "Which of these two search terms have been searched more? ";
    repromptText += currentSearchTerms[0] + " or " + currentSearchTerms[1] + "? ";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
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

    let speechText = "";
    let repromptText = "";

    //get the user's answer (slot value)
    let userName = handlerInput.requestEnvelope.request.intent.slots.userName.value;

    //get the variables stored in the current and persistent session
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const persistentAttributes = handlerInput.attributesManager.getPersistentAttributes();

    //get the leaderboards
    let localLeaderboard = sessionAttributes.localAlexaLeaderboard;
    localLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(localLeaderboard));

    let dBAttributes = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
    let worldLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(dBAttributes.leaderboard));

    //check if the user made it on either score board (make sure you check for a unique userID and not a name)
    let localScorePosition = localLeaderboard.getPositionFromName(handlerInput.requestEnvelope.session.user.userId);
    let isNameInLocalLeaderboard = (localScorePosition != -1);

    let worldScorePosition = worldLeaderboard.getPositionFromName(handlerInput.requestEnvelope.session.user.userId);
    let isNameInWorldLeaderboard = (worldScorePosition != -1);


    if(isNameInLocalLeaderboard && isNameInWorldLeaderboard) {
      localLeaderboard.addNameToPosition(userName, localScorePosition);
      worldLeaderboard.addNameToPosition(userName, worldScorePosition);

      speechText += "Great job " + userName + ". Your score made " + (+localScorePosition+1) + "th place on your Alexa. ";
      speechText += "and " + (+worldScorePosition+1) + "th place in the world! ";
      speechText += sounds.congratulations_sound;
    }
    else if(isNameInLocalLeaderboard && !isNameInWorldLeaderboard) {
      localLeaderboard.addNameToPosition(userName, localScorePosition);

      speechText += "Great job " + userName + ". Your score made " + (+localScorePosition+1) + "th place on your Alexa. ";
      speechText += sounds.congratulations_sound;
    }
    else if(!isNameInLocalLeaderboard && isNameInWorldLeaderboard) {
      worldLeaderboard.addNameToPosition(userName, worldScorePosition);

      speechText += "Great job " + userName + ". Your score made " + (+worldScorePosition+1) + "th place in the world. ";
      speechText += sounds.congratulations_sound;
    }

    //Once the names have been officially added a new entry saved, delete the last
    //entry in order to maintain the length of the leaderboard at LOCAL_LEADERBOARD_LENGTH
    //or WORLD_LEADERBOARD_LENGTH. (When a new entry is added it is spliced into the middle
    //of the array, so the size of the array increases by 1)
    localLeaderboard.removeLastEntry();
    worldLeaderboard.removeLastEntry();

    sessionAttributes.state = StateEnum.MAIN_MENU;
    speechText += variedResponse.getRandomLeaderboardScoreAchievedResponse();
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

    let speechText = "";
    let repromptText = "";
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (sessionAttributes.state == StateEnum.MAIN_MENU) {
      return HowToPlayHandler.handle(handlerInput);
    }
    else if(sessionAttributes.state == StateEnum.GAME_ACTIVE) {
      return RepeatSearchTermsHandler.handle(handlerInput);
    }
    else if(sessionAttributes.state == StateEnum.GAME_OVER) {
      speechText += "You just have to give me a first name so that I can ";
      speechText += "save your score onto the leaderboard. What is your first name? ";
      repromptText = "What is your first name?";
    }
    else if(sessionAttributes.state == StateEnum.LEADERBOARD_MENU) {
      return ShowLeaderboardsToUserHandler.handle(handlerInput);
    }
    else if(sessionAttributes.state == StateEnum.LOCAL_LEADERBOARD) {
      return ShowLocalLeaderboardToUserHandler.handle(handlerInput);
    }
    else if(sessionAttributes.state == StateEnum.WORLD_LEADERBOARD) {
      return ShowWorldLeaderboardToUserHandler.handle(handlerInput);
    }
    else {
      return HowToPlayIntent.handle(handlerInput);
    }

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
  async handle(handlerInput) {
    const speechText = variedResponse.getRandomUserQuitSkillResponse();

    //make sure that a userId is not saved in either of the leaderboards
    await cleanupLeaderboards(handlerInput);

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  async handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    await cleanupLeaderboards(handlerInput);

    return handlerInput.responseBuilder.getResponse();
  },
};

const DefaultHandler = {

  canHandle(handlerInput) {
    return true;
  },
  handle(handlerInput) {

    //This skill will not support one-shot commands so do a check to make
    //sure the skills responds appropriately if the user tries to use this feature.
    let oneShotRequestCheck = checkForOneShotRequest(handlerInput);
    if(oneShotRequestCheck) {
      return oneShotRequestCheck;
    }

    //If Alexa doesn't know what to do, then the other handlers might
    //have failed a state protection check because a game is currently
    //active. Check if the game is active here and respond accordingly.
    let activeGameCheck = checkForActiveGame(handlerInput);
    if(activeGameCheck) {
      return activeGameCheck;
    }

    //If nothing pans out then Alexa should tell the user that she cannot understand the command
    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
}

const ErrorHandler = {
  canHandle() {
    return true;
  },
  async handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    await cleanupLeaderboards(handlerInput);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};



/***********Helper functions************/

function validateUserAnswer(userAnswer) {

  let currentSearchTerms = searchTermsGenerator.getCurrentSearchTerms();

  if((userAnswer.toLowerCase().trim()) == (currentSearchTerms[0].toLowerCase().trim()) ||
      (userAnswer.toLowerCase().trim()) == (currentSearchTerms[1].toLowerCase().trim())) {
      return true; //The user has given a valid answer
  }
  else {
      return false; //The user has given an invalid answer
  }
}

function checkForOneShotRequest(handlerInput) {

  if(handlerInput.attributesManager.getSessionAttributes().state == undefined) {

    let speechText = "";
    let repromptText = "";

    speechText += "This skill does not support one-shot intents or commands. ";
    speechText += "You can use this skill by saying. Alexa. Open chase that trend.";
    repromptText += speechText;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .withShouldEndSession(true)
      .getResponse();
  }
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

async function cleanupLeaderboards(handlerInput) {

  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  let persistentAttributes = handlerInput.attributesManager.getPersistentAttributes();
  let currentUserId = handlerInput.requestEnvelope.session.user.userId;

  //grab local leaderboard
  let localLeaderboard = sessionAttributes.localAlexaLeaderboard;
  localLeaderboard = new Leaderboard(LOCAL_LEADERBOARD_LENGTH, JSON.parse(localLeaderboard));

  for(var i = 0; i<LOCAL_LEADERBOARD_LENGTH; i++) {
    let name = localLeaderboard.getNameFromPosition(i);
    if(name == currentUserId) {
      localLeaderboard.removeEntryAtPosition(i);
    }
  }

  //grab the World Leaderboard
  let dBAttributes = await dynamoDbPersistenceAdapter.getAttributes(handlerInput.requestEnvelope);
  let worldLeaderboard = new Leaderboard(WORLD_LEADERBOARD_LENGTH, JSON.parse(dBAttributes.leaderboard));

  for(var i = 0; i<WORLD_LEADERBOARD_LENGTH; i++) {
    let name = worldLeaderboard.getNameFromPosition(i);
    if(name == currentUserId) {
      worldLeaderboard.removeEntryAtPosition(i);
    }
  }

  sessionAttributes.localAlexaLeaderboard = JSON.stringify(localLeaderboard);
  //save the boards
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  //save DB changes
  dBAttributes.leaderboard = JSON.stringify(worldLeaderboard);
  await dynamoDbPersistenceAdapter.saveAttributes(handlerInput.requestEnvelope, dBAttributes);

  persistentAttributes.localAlexaLeaderboard = sessionAttributes.localAlexaLeaderboard;
  handlerInput.attributesManager.setPersistentAttributes(persistentAttributes);
  await handlerInput.attributesManager.savePersistentAttributes();
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
  sessionAttributes.playAgain = false; //If user plays again, don't explain a buncha stuff again.
  sessionAttributes.localAlexaLeaderboard = persistentAttributes.localAlexaLeaderboard;
  sessionAttributes.state = StateEnum.MAIN_MENU;

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
    MainMenuHandler,
    RepeatSearchTermsHandler,
    GetUserNameHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    DefaultHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('chase-that-trend-user-data')
  .withAutoCreateTable(true)
  .lambda();
