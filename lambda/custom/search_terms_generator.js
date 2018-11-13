const fs = require('fs');
const googleTrends = require('google-trends-api');

//constructor
function SearchTermsGenerator() {

  this.searchTerms = [];
  this.searchGrades = [];
  this.searchTermsList = getSearchTermsListFromTextFile();
}

//public functions
SearchTermsGenerator.prototype.shuffleSearchTerms = async function() {
  this.searchTerms[0] = this.getRandomSearchTerm();
  this.searchTerms[1] = this.getRandomSearchTerm();
  this.searchGrades = await getSearchTermGrades(this.searchTerms);
}

SearchTermsGenerator.prototype.getCurrentSearchTerms = function() {
  return this.searchTerms;
}

SearchTermsGenerator.prototype.getCurrentGrades = function() {
  return this.searchTerms;
}

SearchTermsGenerator.prototype.getWinningSearchTerm = function() {
  return (this.searchGrades[0] > this.searchGrades[1]) ? this.searchTerms[0] : this.searchTerms[1];
}

SearchTermsGenerator.prototype.getGradeDifference = function() {
  return Math.abs(this.searchGrades[1]-this.searchGrades[0]);
}

//private functions
SearchTermsGenerator.prototype.getRandomSearchTerm = function() {
  return this.searchTermsList[Math.floor(Math.random()*(this.searchTermsList.length))];
}

function getSearchTermsListFromTextFile() {

  let text = fs.readFileSync('./search_terms.txt').toString('utf-8');
  return text.split('\n');
}

async function getSearchTermGrades(searchTermsArray) {

  let startDate = new Date('September 7, 2018 03:24:00');
  let endDate = new Date('October 7, 2018 03:24:00');

  //get a JSON string containing search information for both search terms over the past 30 days
  let searchResults = await googleTrends.interestOverTime(
    {keyword: [searchTermsArray[0], searchTermsArray[1]],
    startTime: startDate,
    endTime: endDate}
  );

  //parse the JSON string and begin extracting desired information from arbitrary JSON labels
  let searchData = JSON.parse(searchResults).default;

  //Array to hold 30 grade pairs for constructing an average grade for each term over time.
  let gradePerDayList = [[],[]];

  //For each day, find the grade/value for that day and add it to the list.
  //If no grade is available, then make both grades 0 for that day so they do
  //not contribute to the average.
  for(var i = 0; i<30; i++) {
    //This if statment will run if either search term does not have data for that day
    if(!(searchData.timelineData[i].hasData[0]) || !(searchData.timelineData[i].hasData[1])) {
      gradePerDayList[0].push(0);
      gradePerDayList[1].push(0);
    }
    else {
      gradePerDayList[0].push(searchData.timelineData[i].value[0]);
      gradePerDayList[1].push(searchData.timelineData[i].value[1]);
    }
  }

  //find the average grade of each search term over the last 30 days
  //reduce will sum all of the grades in the array
  let avg1 = (gradePerDayList[0].reduce((a,b) => a+b, 0))/gradePerDayList[0].length;
  let avg2 = (gradePerDayList[1].reduce((a,b) => a+b, 0))/gradePerDayList[1].length;

  return [avg1, avg2];
}
