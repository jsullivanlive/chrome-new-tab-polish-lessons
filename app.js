console.log("starting...");

// import json data from words file


// Store quiz data
let quizData = [];
let currentQuestion = null;
let score = 0;
let questionsAnswered = 0;



const _first = (xmlDoc, tagname) => {
  const elements = xmlDoc.getElementsByTagName(tagname);
  return elements.length > 0 ? elements[0].innerHTML : "";
};

// Get multiple entries for quiz
const getQuizData = async () => {
  try {
    quizData = await fetch("words.json").then((res) => res.json());
    debugger;
    console.log(
      `Loaded ${quizData.length} entries for quiz:`,
      quizData.map((entry) => entry.word)
    );
  } catch (error) {
    alert("Error fetching data: " + error);
  }
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const generateQuestion = () => {
  if (questionsAnswered >= 5) {
    showFinalScore();
    return;
  }

  // Randomly decide if we show word->translation or translation->word
  const showWord = Math.random() > 0.5;

  // Pick a random correct answer
  const correctAnswer = quizData[Math.floor(Math.random() * quizData.length)];

  // Pick 2 random wrong answers
  const wrongAnswers = quizData
    .filter((item) => item !== correctAnswer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  // Combine and shuffle all answers
  const allAnswers = shuffleArray([correctAnswer, ...wrongAnswers]);

  currentQuestion = {
    type: showWord ? "word-to-translation" : "translation-to-word",
    correct: correctAnswer,
    answers: allAnswers,
    question: showWord ? correctAnswer.word : correctAnswer.translation,
  };

  displayQuestion();
};

const displayQuestion = () => {
  const questionText =
    currentQuestion.type === "word-to-translation"
      ? `What does "<strong>${currentQuestion.question}</strong>" mean?`
      : `What is the Polish word for "<strong>${currentQuestion.question}</strong>"?`;

  const answersHtml = currentQuestion.answers
    .map((answer, index) => {
      const answerText =
        currentQuestion.type === "word-to-translation"
          ? answer.translation
          : answer.word;

      return `<button class="answer-btn" onclick="selectAnswer(${index})">${answerText}</button>`;
    })
    .join("");

  document.getElementById("output").innerHTML = `
    <div class="quiz-container">
      <div class="score">Score: ${score}/${questionsAnswered}</div>
      <div class="question-number">Question ${questionsAnswered + 1} of 5</div>
      <div class="question">${questionText}</div>
      <div class="answers">${answersHtml}</div>
    </div>
  `;
};

const selectAnswer = (selectedIndex) => {
  const selectedAnswer = currentQuestion.answers[selectedIndex];
  const isCorrect = selectedAnswer === currentQuestion.correct;

  if (isCorrect) {
    score++;
  }
  questionsAnswered++;

  // Show feedback
  showFeedback(isCorrect, selectedIndex);
};

const showFeedback = (isCorrect, selectedIndex) => {
  const buttons = document.querySelectorAll(".answer-btn");

  // Highlight the selected answer
  buttons[selectedIndex].classList.add(isCorrect ? "correct" : "wrong");

  // Highlight the correct answer if user was wrong
  if (!isCorrect) {
    const correctIndex = currentQuestion.answers.indexOf(
      currentQuestion.correct
    );
    buttons[correctIndex].classList.add("correct");
  }

  // Disable all buttons
  buttons.forEach((btn) => (btn.disabled = true));

  // Show feedback message and example phrase
  const feedbackMsg = isCorrect ? "Correct! 🎉" : "Wrong! 😞";
  const correctAnswer = currentQuestion.correct;

  const feedbackHtml = `
    <div class="feedback ${isCorrect ? "feedback-correct" : "feedback-wrong"}">
      <div class="feedback-message">${feedbackMsg}</div>
      <div class="word-details">
        <strong>${correctAnswer.word}</strong> = <em>${
    correctAnswer.translation
  }</em>
        <br/>
        <small>"${correctAnswer.fnphrase}" = "${correctAnswer.enphrase}"</small>
      </div>
      <button onclick="nextQuestion()" class="next-btn">Next Question</button>
    </div>
  `;

  document.querySelector(".quiz-container").innerHTML += feedbackHtml;
};

const nextQuestion = () => {
  generateQuestion();
};

const showFinalScore = () => {
  const percentage = Math.round((score / 5) * 100);
  let message = "";

  if (percentage >= 80) {
    message = "Excellent! 🌟";
  } else if (percentage >= 60) {
    message = "Good job! 👍";
  } else {
    message = "Keep practicing! 📚";
  }

  document.getElementById("output").innerHTML = `
    <div class="quiz-container">
      <div class="final-score">
        <h2>Quiz Complete!</h2>
        <div class="score-display">${score}/5 (${percentage}%)</div>
        <div class="score-message">${message}</div>
        <button onclick="restartQuiz()" class="restart-btn">Try Again</button>
      </div>
    </div>
  `;
};

const restartQuiz = () => {
  score = 0;
  questionsAnswered = 0;
  generateQuestion();
};

// Initialize the quiz
(async () => {
  await getQuizData();
  generateQuestion();
})();
