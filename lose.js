const livesLeft = localStorage.getItem("livesLeft");
const lettersGuessed = localStorage.getItem("lettersGuessed");

document.querySelector(".lives-left").innerHTML = livesLeft;
document.querySelector(".guessed-letters").innerHTML = lettersGuessed;
document.querySelector(".ranking").innerHTML = "Last";