const livesLeft = localStorage.getItem("livesLeft");
const lettersGuessed = localStorage.getItem("lettersGuessed");
const scores = localStorage.getItem("scores");

const sortedScores = JSON.parse(scores).sort((a, b) => b - a); //sorteren van hoog naar laag
const rang = sortedScores.indexOf(parseInt(livesLeft)) + 1; //rang bepalen van huidige score

function rangName(rang) {
    if(rang === 1) {
        return "1ste";
    } 
    return `${rang}de`;
}

document.querySelector(".lives-left").innerHTML = livesLeft;
document.querySelector(".guessed-letters").innerHTML = lettersGuessed;
document.querySelector(".ranking").innerHTML = rangName(rang);