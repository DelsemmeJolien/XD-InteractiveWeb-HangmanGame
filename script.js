// TEACHABLE MACHINE
// More API functions here:
// https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

// the link to your model provided by Teachable Machine export panel
const URL = "./mymodel/";
let model, webcam, ctx, labelContainer, maxPredictions;

/* -------- VARIABELEN VOOR TEACHABLE MACHINE-POSES -------- */
const cooldown = 500;
const predictInterval = 200;

let lastMoveTime = 0;
let selectTimer = null;
let currentPose = null;
let lastPredict = 0;

/* -------- VARIABELEN INTRO/TUTORIAL SCREEN -------- */
const tutorialInfo = [
    { title: "POSE: RIGHT", description: "Stretch your arm to right to move your cursor right." },
    { title: "POSE: LEFT", description: "Stretch your arm to left to move your cursor left." },
    { title: "POSE: UP", description: "Stretch your both arms straight above your head to move your cursor up." },
    { title: "POSE: DOWN", description: "Stretch your both arm down in a downwards V to move your cursor down." },
    { title: "POSE: NEUTRAL", description: "Keep both arms straight beside you body to select a letter." }
];
const totalSteps = 5;

let activeScreen = "intro"; //default waarde
let tutorialTimer = null;
let currentStep = 1;

/* -------- VARIABELEN GAME SCREEN -------- */
const word = "EMPATHY";
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const hangman = [
    'hangman-rope',
    'hangman-head',
    'hangman-body',
    'hangman-arms',
    'hangman-legs'
]

let letters;
let guessedLetter = new Set();
let maxWrong = 5;
let countWrong = 0;
let cursorIndex = 0;
let countdown = null;

/* -------- FUNCTIES TEACHABLE MACHINE -------- */
async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // Note: the pose library adds a tmPose object to your window (window.tmPose)
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    //const webcams
    const canvasId = activeScreen === "intro" ? "canvas-tutorial" : "canvas";
    const placeholderId = activeScreen === "intro" ? "camera-placeholder-tutorial" : "camera-placeholder";
    const dotId = activeScreen === "intro" ? "camera-dot-tutorial" : "camera-dot";

    // Convenience function to setup a webcam
    const flip = true; // whether to flip the webcam
    webcam = new tmPose.Webcam(activeScreen === "intro" ? 560 : 360 , activeScreen === "intro" ? 340 : 240, flip); //16:9 is toturial true dan grote camera anders kleine camera
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // append/get elements to the DOM
    const canvas = document.getElementById(canvasId);
    canvas.width = activeScreen === "intro" ? 560 : 360;
    canvas.height = activeScreen === "intro" ? 340 : 240;
    ctx = canvas.getContext("2d");

    //placeholder vervangen
    document.getElementById(placeholderId).style.display = 'none';
    //camera dot actief zetten
    document.getElementById(dotId).classList.add('active');
}

async function loop(timestamp) {
    webcam.update(); // update the webcam frame

    if(timestamp - lastPredict > predictInterval) {
        lastPredict = timestamp;
        await predict();
    } else {
        drawPose(); //teken pose zonder nieuwe voorspelling
    }
    window.requestAnimationFrame(loop);
}

async function predict() {
    // Prediction #1: run input through posenet
    // estimatePose can take in an image, video or canvas html element
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    // Prediction 2: run input through teachable machine classification model
    const prediction = await model.predict(posenetOutput);

    //vergelijkt klassen en houde beste bij
    let best = prediction.reduce((a, b) => a.probability > b.probability ? a : b); 
    //meer dan 90% zeker -> gebruiken
    const poseName = best.probability > 0.90 ? best.className : null;

    //CODE TUTORIAL SCREEN
    if (activeScreen === "intro") {
        document.querySelector("#current-pose").innerHTML = poseName ?? '—';
    }

    const tutorialPoses = ["Right","Left", "Up", "Down", "Neutral",];//verzamel classes in array in de juiste volgorde
    const expectedPose = tutorialPoses[currentStep - 1] //verwachte pose voor huidige stap

    if(activeScreen === "intro" && currentStep <= totalSteps){
        if(poseName === expectedPose){ //als de gedetecteerde pose overeenkomt met de verwachte pose voor deze stap
            if(!tutorialTimer){ //als timer nog niet gestart is -> starten
                tutorialTimer = setTimeout(() => {
                    // Timer afgesloten
                    tutorialTimer = null;
                    nextStep(); //ga naar volgende stap
                }, 2000); // 2 seconden om pose uit te voeren
            } 
        } else {
            if(tutorialTimer){ //als pose verandert voordat timer afgelopen is -> timer resetten
                clearTimeout(tutorialTimer);
                tutorialTimer = null; //als pose verandert -> timer resetten
            }
        }
    }

    if (activeScreen === "game") {
        document.querySelector('#current-pose-game').textContent = poseName ?? '—';
    }   

    if(activeScreen !== "intro"){
    //verplaats cursor max 2 keer per sec
        const now = Date.now();
        if(now - lastMoveTime > cooldown){
            //beweeg cursor op basis van poses (klasses)
            //zet last move naar nu
            if (poseName === "Left") {
                updateCursor(-1);
                lastMoveTime = now; 
            }
            if (poseName === "Right") {
                updateCursor(1);
                lastMoveTime = now;
            }
            if (poseName === "Up") {
                updateCursor(-9);
                lastMoveTime = now;
            }
            if (poseName === "Down") {
                updateCursor(9);
                lastMoveTime = now;
            }
        }

        if(poseName === "Neutral"){
            if (currentPose !== "Neutral") { //alleen als we net in Neutral komen en er nog geen timer loopt
                currentPose = "Neutral"; //zet huidige pose neutraal
                selectTimer = setTimeout(() => {
                    checkGuess(letters[cursorIndex].dataset.letter); //functie uitvoeren uitstellen
                    currentPose = null; //huidige pose terug naar null
                }, 2000); //voor uit na 2 sec
            }
        } else { //als we van pose veranderen (en niet naar neutraal gaan) -> timer resetten en huidige pose opslaan
            clearTimeout(selectTimer); //stop timer bij poseverandering
            currentPose = poseName; //huidige pose opslagen
        }
    }

    //finally draw the poses
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

/* -------- FUNCTIES INTRO/TUTORIAL SCREEN -------- */

function updateProgress(step) { //progressbar en step counter updaten
  document.querySelector('#progress-fill').style.width = (step / totalSteps * 100) + '%';
  document.querySelector('#step-counter').textContent = `Stap ${step} van ${totalSteps}`;
}

function nextStep() { //volgende stap tutorial
    if (currentStep < totalSteps) {
        currentStep++;
        updateProgress(currentStep);

        //update titel en beschrijving
        let info = tutorialInfo[currentStep - 1];
        document.querySelector('#step-title').innerHTML = info.title;
        document.querySelector('#step-description').innerHTML = info.description;

        //active state op huidige pose in tutorial zetten
        document.querySelectorAll(".pose-instructions .box").forEach(box => {
            box.classList.remove("active");
        });
        document.querySelector(`#pose-${currentStep}`).classList.add("active");

    } else{
        showScreen("game"); // Tutorial voltooid, ga naar game scherm
    }
}

/* -------- FUNCTIES GAME SCREEN -------- */

function getWord(){ //woord weergeven als lege vakjes
    let wordDisplay = document.querySelector("#word-display");
    wordDisplay.innerHTML = '';

    word.split('').forEach(letter => {
        const divLetter = document.createElement("div");
        divLetter.innerHTML = `<p class="letterWord" data-letter="${letter}" </p>`;
        wordDisplay.appendChild(divLetter);
    });
}

function showLetter(letter){ //letter tonen als deze geraden is
    document.querySelectorAll(".letterWord").forEach(letterWord => {
        if (letterWord.dataset.letter === letter){
            letterWord.innerHTML = letter;
        }
    })
}

function showLives(){ //levens weergeven
    const displayLives = document.querySelector("#lives-display");
    displayLives.innerHTML = '';

    for(let i = 0; i < maxWrong; i++){
        let p = document.createElement("p");
        if( i < maxWrong - countWrong) { 
            p.innerHTML = '<i class="fa-solid fa-heart fa-xl"></i>';
        } else {
            p.innerHTML = '<i class="fa-regular fa-heart fa-xl"></i>';
        }
        displayLives.appendChild(p);
    }
}

function updateLives(){ //levens updaten na fout gok
    showLives();
}

function updateHangman(){ //hangman tonen na fout gok
    document.querySelectorAll(`.${hangman[countWrong-1]}`).forEach(bodypart => {
        bodypart.style.display = 'inline';
    });
}

function checkGuess(letter) { //controleer of geraden letter in woord zit -> update scherm ?
    if (guessedLetter.has(letter)) return; //als letter al in set zit (geraden is) -> stop/return
    guessedLetter.add(letter); //voeg letter toe aan set

    let keyLetter = document.querySelector(`.letter[data-letter="${letter}"]`)

    if(word.includes(letter)){
        showLetter(letter); //bevat woord letter? -> toon letter
        keyLetter.classList.add("correct"); //voeg opmaak toe
    } else {
        countWrong++; //add voeg
        updateLives(); //remove live
        updateHangman(); //add hangman bodypart
        keyLetter.classList.add("wrong"); //voeg opmaak toe
    }

    //check of game voorbij is (win, lose of doorgaan)
    checkGameOver();
}

function checkGameOver(){ //controleer of game voorbij is (win, lose of doorgaan)
    const win = word.split('').every(letter => guessedLetter.has(letter)); //als elke letter van het woord in de set letters zit
    const lose = countWrong >= maxWrong;

    if(win) {
        saveScores();
        showScreen("win");

    } else if(lose){
        saveScores();
        showScreen("lose");
    }
}

function saveScores(){ //bewaar scores in local storage en update ranglijst
    let livesLeft = maxWrong - countWrong;

    //huidige score bewaren
    localStorage.setItem ("livesLeft", livesLeft);
    localStorage.setItem("lettersGuessed", guessedLetter.size);

    //score opslagen in ranglijst
    const scores = JSON.parse(localStorage.getItem("scores") || "[]");
    scores.push(livesLeft);
    localStorage.setItem("scores", JSON.stringify(scores));

    const sortedScores = scores.sort((a, b) => b - a); //sorteren van hoog naar laag
    const rang = sortedScores.indexOf(parseInt(livesLeft)) + 1; //rang bepalen van huidige score

    //in html plaatsen
    document.querySelectorAll(".lives-left").forEach(element => {
        element.innerHTML = livesLeft;
    });
    document.querySelectorAll(".guessed-letters").forEach(element => {
        element.innerHTML = guessedLetter.size;
    });
    document.querySelector(".ranking-win").innerHTML = rangName(rang);
    document.querySelector(".ranking-lose").innerHTML = "Last";

    // Timer starten en naar intro
    restartGame();
}

/* -------- FUNCTIES WIN/LOSE -------- */
function rangName(rang) { //toon plaats rang op basis van rangnummer
    if(rang === 1) {
        return "1ste";
    } 
    return `${rang}de`;
}

function restartGame(){ //timer starten voor terug naar intro
    let seconds = 90;
    let timer = document.querySelectorAll(".timer");
    timer.forEach(t => {
        t.innerHTML = seconds;
    })

    countdown = setInterval(() => {
        seconds--;
        timer.forEach(t => {
            t.innerHTML = seconds;
         })
        if(seconds <= 0) {
            clearInterval(countdown);
            resetGame();
        }
    }, 1000);
}

/* -------- FUNCTIES ALGEMEEN -------- */

function updateCursor(position = 0){ //verplaas cursor op basis van positie (1 = rechts, -1 = links, 9 = onder, -9 = boven)
    letters = document.querySelectorAll(".letter");

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

function showScreen(id){ //toon juiste scherm en verberg andere schermen
    document.querySelectorAll("section").forEach(section => {
        section.style.display = "none";
    });
    document.querySelector(`#${id}`).style.display = "block";
    activeScreen = id;

    if (id === "game") {
        letters = document.querySelectorAll(".letter");
        getWord();
        showLives();
        updateCursor();
        init(); // camera starten voor game
    }

    if (id === "win" || id === "lose") {
        if (webcam) webcam.playing = false; //stop webcam bij win of lose
    }
}

function resetGame(){ //reset alle variabelen en schermen voor een nieuw spel
    letters = document.querySelectorAll(".letter");

    // Variabelen resetten
    guessedLetter = new Set();
    countWrong = 0;
    cursorIndex = 0;

    // Tutorial resetten
    currentStep = 1;
    updateProgress(1);
    document.querySelector('#step-title').innerHTML = tutorialInfo[0].title;
    document.querySelector('#step-description').innerHTML = tutorialInfo[0].description;
    document.querySelectorAll(".pose-instructions .box").forEach(box => box.classList.remove("active"));
    document.querySelector('#pose-1').classList.add("active");

    // Timer stoppen
    if(countdown) clearInterval(countdown);

    // Hangman verbergen
    hangman.forEach(part => {
        document.querySelectorAll(`.${part}`).forEach(bodypart =>{
            bodypart.style.display = 'none';
        });
    });

    // Keyboard resetten
    letters.forEach(letter => {
        letter.classList.remove("correct", "wrong", "active");
    });

    // Word en lives opnieuw renderen
    getWord();
    showLives();
    updateCursor();

    // Naar game scherm
    showScreen("intro");
    init();
}

/* -------- START CODE & EVENT LISTENER VOOR KEYBOARD INPUT  -------- */ 
showScreen("intro"); //start op tutorial screen
init();

document.addEventListener('keydown', (e) => {
    const letter = e.key.toUpperCase(); //ingedrukte letter -> hoofdletter
    //test welke arrow (key) wordt gebruikt
    if (activeScreen === "game") {
        if (e.key === 'ArrowRight') { updateCursor(1); }
        if (e.key === 'ArrowLeft') { updateCursor(-1); }
        if (e.key === 'ArrowUp') { updateCursor(-9); }
        if (e.key === 'ArrowDown') { updateCursor(9); }
        if (e.key === 'Enter') { checkGuess(letters[cursorIndex].dataset.letter); }
        updateCursor();
        if (alphabet.includes(letter)) { checkGuess(letter); }
    }

    //turorial screen test
    if (e.key === ' ') { // spatiebalk = volgende stap
        nextStep();
    }
});