// TEACHABLE MACHINE
// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "./mymodel/";
let model, webcam, ctx, labelContainer, maxPredictions;

async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // Note: the pose library adds a tmPose object to your window (window.tmPose)
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Convenience function to setup a webcam
    //const size = 200;
    const flip = true; // whether to flip the webcam
    //webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
    webcam = new tmPose.Webcam(360, 240, flip); //16:9
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // append/get elements to the DOM
    const canvas = document.getElementById("canvas");
    // canvas.width = size; 
    // canvas.height = size;
    canvas.width = 360;
    canvas.height = 240;
    ctx = canvas.getContext("2d");
    // labelContainer = document.getElementById("label-container");
    // for (let i = 0; i < maxPredictions; i++) { // and class labels
    //     labelContainer.appendChild(document.createElement("div"));
    // }

    //placeholder vervangen
    document.getElementById('camera-placeholder').style.display = 'none';
    //camera dot actief zetten
    document.getElementById('camera-dot').classList.add('active');
}

async function loop(timestamp) {
    webcam.update(); // update the webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    // Prediction #1: run input through posenet
    // estimatePose can take in an image, video or canvas html element
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    // Prediction 2: run input through teachable machine classification model
    const prediction = await model.predict(posenetOutput);

    // for (let i = 0; i < maxPredictions; i++) {
    //     const classPrediction =
    //         prediction[i].className + ": " + prediction[i].probability.toFixed(2);
    //     labelContainer.childNodes[i].innerHTML = classPrediction;
    // }

    let best = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
    const poseName = best.probability > 0.75 ? best.className : null;
    console.log(poseName);

    // finally draw the poses
    drawPose(pose);
}

function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        // draw the keypoints and skeleton
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }
}

//CODE GAME

//VARIABLES
const WORD = "EMPATHY";
const Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letters = document.querySelectorAll(".letter");
const hangman = [
    'hangman-head',
    'hangman-body',
    'hangman-arm1',
    'hangman-arm2',
    'hangman-leg1',
    'hangman-leg2'
]

let guessedLetter = new Set();
let maxWong = 5;
let countWrong = 0;
let cursorIndex = 0;

//FUNCTIES
function getWord(){
    let wordDisplay = document.querySelector("#word-display");
    wordDisplay.innerHTML = '';

    WORD.split('').forEach(letter => {
        const divLetter = document.createElement("div");
        divLetter.innerHTML = `<p class="letterWord" data-letter="${letter}" </p>`;
        wordDisplay.appendChild(divLetter);
    });
}

function showLetter(letter){
    document.querySelectorAll(".letterWord").forEach(letterWord => {
        if (letterWord.dataset.letter === letter){
            letterWord.innerHTML = letter;
        }
    })
}

function showLives(){
    const displayLives = document.querySelector("#lives-display");
    displayLives.innerHTML = '';

    for(let i = 0; i < maxWong; i++){
        let p = document.createElement("p");
        if( i < maxWong - countWrong) { 
            p.innerHTML = '<i class="fa-solid fa-heart fa-xl"></i>';
        } else {
            p.innerHTML = '<i class="fa-regular fa-heart fa-xl"></i>';
        }
        displayLives.appendChild(p);
    }
}

function updateLives(){
    showLives();
}

function updateHangman(){
    document.querySelector(`#${hangman[countWrong-1]}`).style.display = 'inline'; //eerstvolgende onderste deel van hangman selecteren in html
}

//default waarde positie is 0
function updateCursor(position = 0){
    if(position !== 0){
        let newIndex = cursorIndex + position; //nieuwe positie

        while(newIndex >= 0 && newIndex < letters.length){ 
            //zolang letter niet gebruikt is
            if(!letters[newIndex].classList.contains("correct") &&
                !letters[newIndex].classList.contains("wrong")){
                    //eerstvolgende positie die niet gegokt is
                    cursorIndex = newIndex;
                    break;
                }
            //gebruikt -> gewoon volgende letter
            newIndex += position;
        }
    }

    //active state verwijderen van alle letters
    letters.forEach(letter => {
        letter.classList.remove("active");
    });

    //active state op huidige letter
    letters[cursorIndex].classList.add("active");
}

function checkGuess(letter) {
    if (guessedLetter.has(letter)) return; //als letter al in set zit (geraden is) -> stop/return
    guessedLetter.add(letter); //voeg letter toe aan set

    let keyLetter = document.querySelector(`.letter[data-letter="${letter}"]`)

    if(WORD.includes(letter)){
        showLetter(letter); //bevat woord letter? -> toon letter
        keyLetter.classList.add("correct"); //voeg opmaak toe
        console.log(letter + "-> juist gegokt");
    } else {
        countWrong++; //add voeg
        updateLives(); //remove live
        updateHangman(); //add hangman bodypart
        keyLetter.classList.add("wrong"); //voeg opmaak toe
        console.log(letter + "-> FOUT gegokt");
    }

    //check of game voorbij is (win, lose of doorgaan)
    checkGameOver();
}

function checkGameOver(){
    const win = WORD.split('').every(letter => guessedLetter.has(letter)); //als elke letter van het woord in de set letters zit
    const lose = countWrong >= maxWong;

    if(win) {
        window.location.href = 'win.html';
    } else if(lose){
        window.location.href = "lose.html"
    }
}

//TEACHABLE MACHINE STARTEN    
init();
getWord();
showLives();
updateCursor();

document.addEventListener('keydown', (e) => {
    const letter = e.key.toUpperCase(); //ingedrukte letter -> hoofdletter
    //test welke arrow (key) wordt gebruikt
    if (e.key === 'ArrowRight') { updateCursor(1);}
    if (e.key === 'ArrowLeft') {updateCursor(-1);}
    if (e.key === 'ArrowUp')  {updateCursor(-9);}
    if (e.key === 'ArrowDown') { updateCursor(9);}
    if (e.key === 'Enter') {
        checkGuess(letters[cursorIndex].dataset.letter);
    }

    updateCursor();

    //controleer letter 
    if (Alphabet.includes(letter)){
        checkGuess(letter);
    }
});