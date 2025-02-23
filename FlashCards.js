window.onload = function () {
    let questionSets = [];
    let selectedSets = [];
    let questions = [];
    let currentQuestionIndex = 0;
    let correctAnswers = 0;
    let startTime;

    mainMenu();


    // Load current date & time every second
    function updateDateTime() {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString();
        const formattedDate = now.toLocaleDateString();
        document.getElementById("datetime").textContent = `${formattedDate} ${formattedTime}`;
    }

    setInterval(updateDateTime, 1000);

    function fetchQuestionSets() {
        fetch("./FlashCards.json")
            .then(response => response.json())
            .then(data => {
                questionSets = data.question_sets;
                mainMenu();
            })
            .catch(error => console.error("Error loading JSON:", error));
    }

    function mainMenu() {
        const menu = document.getElementById("menu");
        menu.innerHTML = "<p id='menu-text'>Please choose a Mode</p>";

        const normalBtn = document.createElement("button");
        normalBtn.textContent = "Normal Mode";
        normalBtn.className = "mainMenuBtn";
        normalBtn.onclick = () => loadMenuNormal();
        menu.appendChild(normalBtn);

        const examBtn = document.createElement("button");
        examBtn.textContent = "Exam Mode";
        examBtn.className = "mainMenuBtn";
        examBtn.onclick = () => selectMultipleSets();
        menu.appendChild(examBtn);
    }

    function loadMenuNormal() {
        const menu = document.getElementById("menu");
        menu.innerHTML = "<p id='normalMenu-text'>Please choose a Question Set</p>";

        questionSets.forEach((set, index) => {
            const btn = document.createElement("button");
            btn.textContent = set.name;
            btn.className = "normalMenuBtn";
            btn.onclick = () => selectSet(index);
            menu.appendChild(btn);
        });
    }

    function selectSet(index) {
        selectedSets = [questionSets[index]];
        setupOptions();
    }

    function selectMultipleSets() {
        const menu = document.getElementById("menu");
        menu.innerHTML = "<p id='multipleMenu-text'>Select multiple sets, then press 'Continue'</p>";

        questionSets.forEach((set, index) => {
            const btn = document.createElement("button");
            btn.textContent = set.name;
            btn.className = "multipleMenuBtn";
            btn.onclick = () => toggleSelection(index, btn);
            menu.appendChild(btn);
        });

        const continueBtn = document.createElement("button");
        continueBtn.textContent = "Continue";
        continueBtn.onclick = () => setupOptions();
        menu.appendChild(continueBtn);
    }

    function toggleSelection(index, button) {
        const set = questionSets[index];
        const selectedIndex = selectedSets.indexOf(set);

        if (selectedIndex === -1) {
            selectedSets.push(set);
            button.style.backgroundColor = "#28a745"; // Green for selected
        } else {
            selectedSets.splice(selectedIndex, 1);
            button.style.backgroundColor = "#007bff"; // Reset color
        }
    }

    function setupOptions() {
        const menu = document.getElementById("menu");
        menu.innerHTML = "<p id='setupOptions'>Choose Question Options</p>";

        // Calculate min & max questions based on selected sets
        const maxQuestions = selectedSets.reduce((sum, set) => sum + set.questions.length, 0);
        const minQuestions = 1;

        // Create input field with constraints
        const numberInput = document.createElement("input");
        numberInput.type = "number";
        numberInput.min = minQuestions;
        numberInput.max = maxQuestions;
        numberInput.value = Math.min(10, maxQuestions); // Default: 10 or max available
        numberInput.placeholder = `Max: ${maxQuestions}`;
        numberInput.className = "questionCountInput"; // For better styling

        // Create buttons
        const randomFullBtn = document.createElement("button");
        randomFullBtn.textContent = "Full Random";
        randomFullBtn.onclick = () => startQuiz(numberInput.value, "full");

        const randomWeightedBtn = document.createElement("button");
        randomWeightedBtn.textContent = "Weighted Random";
        randomWeightedBtn.onclick = () => startQuiz(numberInput.value, "weighted");

        // Append elements
        menu.appendChild(numberInput);
        menu.appendChild(randomFullBtn);
        menu.appendChild(randomWeightedBtn);

        // Auto-focus on number input
        numberInput.focus();
    }


    let timerInterval; // Global variable for the timer

    function startQuiz(questionCount, mode) {
        questions = selectedSets.flatMap(set => set.questions);
        questions = shuffle(questions).slice(0, questionCount);
        startTime = Date.now();
        correctAnswers = 0;
        currentQuestionIndex = 0;

        // Start the timer
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);

        displayQuestion();
    }

    function updateTimer() {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById("timer").textContent = `Quiz Timer: ${elapsedSeconds}s`; // Update the page title
    }

    // Declare global variables for event handlers
    let handleEnterKey;
    let handleInputEnterKey;

    function displayQuestion() {
        if (currentQuestionIndex >= questions.length) return showResults();

        const menu = document.getElementById("menu");
        menu.innerHTML = "";
        const questionObj = questions[currentQuestionIndex];

        const questionText = document.createElement("p");
        questionText.textContent = questionObj.question;
        menu.appendChild(questionText);

        if (questionObj.image) {
            const img = document.createElement("img");
            img.src = questionObj.image;
            menu.appendChild(img);
        }

        // Remove previous event listeners if they exist
        if (handleEnterKey) document.removeEventListener("keydown", handleEnterKey);
        if (handleInputEnterKey) document.removeEventListener("keyup", handleInputEnterKey);

        if (Array.isArray(questionObj.answer)) {
            questionObj.answer.forEach(option => {
                const btn = document.createElement("button");
                btn.textContent = option;
                btn.onclick = () => checkAnswer(option, questionObj.correct_answer);
                menu.appendChild(btn);
            });

            // Define the handler and attach it
            handleEnterKey = function(event) {
                if (event.key === "Enter") {
                    if (questionObj.answer[0].length !== 0) {
                        document.removeEventListener("keyup", handleEnterKey);
                        checkAnswer(questionObj.answer[0], questionObj.correct_answer); // Uses first option as default
                    }
                }
            };
            document.addEventListener("keyup", handleEnterKey);

        } else {
            const input = document.createElement("input");
            const submit = document.createElement("button");
            submit.textContent = "Submit";

            submit.addEventListener("click", function() {
                checkAnswer(input.value, questionObj.answer);
            });

            // Define the handler and attach it
            handleInputEnterKey = function(event) {
                if (event.key === "Enter") {
                    if (input.value.length !== 0) {
                        document.removeEventListener("keyup", handleInputEnterKey);
                        checkAnswer(input.value, questionObj.answer);
                    }
                }
            };
            document.addEventListener("keyup", handleInputEnterKey);

            menu.appendChild(input);
            menu.appendChild(submit);

            // Automatically focus on the input box
            input.focus(); // This line adds the auto-focus feature
        }
    }

    function checkAnswer(userAnswer, correctAnswer) {
        const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase();
        document.body.style.backgroundColor = isCorrect ? "green" : "red";

        let timeoutInterval = 300;

        if (isCorrect) {
            correctAnswers++;
            document.getElementById("counter").textContent = `✅ Score: ${correctAnswers}`;
        } else {
            document.getElementsByTagName("input")[0].value = `❌ Correct Answer: ${correctAnswer}`;
            document.getElementsByTagName("input")[0].readOnly = true;
            timeoutInterval = 1700;
        }

        const nextQuestion = () => {
            document.body.style.backgroundColor = "";
            currentQuestionIndex++;
            document.removeEventListener("keyup", skipTimeout);
            displayQuestion();
        }

        let timeoutId = setTimeout(() => {
            nextQuestion();
        }, timeoutInterval);

        const skipTimeout = (event) => {
            if (event.key === "Enter") {
                console.log("Skipping timeout");
                document.removeEventListener("keyup", skipTimeout);
                clearTimeout(timeoutId);
                nextQuestion();
            }
        }

        document.addEventListener("keyup", skipTimeout);
    }


    function showResults() {
        clearInterval(timerInterval); // Stop the timer
        document.title = "Quiz Completed! ✅"; // Update taskbar title

        document.getElementById("timer").textContent = "✅ Finished";
        const menu = document.getElementById("menu");
        menu.innerHTML = `<p>Results</p>
                      <p>Time Taken: ${(Date.now() - startTime) / 1000} seconds</p>
                      <p>Score: ${correctAnswers} / ${questions.length}</p>
                      <button onclick="window.location.reload()">Restart</button>`;
    }

    function shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    fetchQuestionSets();
};
