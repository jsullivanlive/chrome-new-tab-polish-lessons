console.log("starting...");

// import json data from words file


// Store quiz data
let quizData = [];
let cards = [];
let currentCardIndex = 0;
let score = 0;
let questionsAnswered = 0;



const _first = (xmlDoc, tagname) => {
  const elements = xmlDoc.getElementsByTagName(tagname);
  return elements.length > 0 ? elements[0].innerHTML : "";
};

// Get multiple entries for quiz
const getQuizData = async () => {
  try {
    console.log("Fetching words.json...");
    const response = await fetch("words.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    quizData = await response.json();
    console.log(
      `Loaded ${quizData.length} entries for quiz:`,
      quizData.map((entry) => entry.word)
    );
    return quizData;
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Error fetching data: " + error.message);
    // Provide fallback data
    quizData = [
      {
        word: "dziękuję",
        translation: "thank you",
        fnphrase: "Dziękuję bardzo",
        enphrase: "Thank you very much",
      },
      {
        word: "tak",
        translation: "yes",
        fnphrase: "Tak, to prawda",
        enphrase: "Yes, that's true",
      },
      {
        word: "nie",
        translation: "no",
        fnphrase: "Nie, to nieprawda",
        enphrase: "No, that's not true",
      },
    ];
    return quizData;
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
  console.log("generateQuestion called, questionsAnswered:", questionsAnswered);
  console.log("quizData length:", quizData.length);

  if (questionsAnswered >= 5) {
    showFinalScore();
    return;
  }

  if (!quizData || quizData.length === 0) {
    console.error("No quiz data available!");
    document.getElementById("output").innerHTML = `
      <div class="quiz-container">
        <div class="error">Error: No quiz data loaded. Please refresh the page.</div>
      </div>
    `;
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

  const newCard = {
    id: questionsAnswered,
    type: showWord ? "word-to-translation" : "translation-to-word",
    correct: correctAnswer,
    answers: allAnswers,
    question: showWord ? correctAnswer.word : correctAnswer.translation,
    answered: false,
    isCorrect: null
  };

  cards.push(newCard);
  createCardElement(newCard);
  updateCardPositions();
};

const createCardElement = (card) => {
  const questionText = card.type === "word-to-translation"
    ? `"<strong>${card.question}</strong>"`
    : `"<strong>${card.question}</strong>"`;

  const answersHtml = card.answers
    .map((answer, index) => {
      const answerText = card.type === "word-to-translation"
        ? answer.translation
        : answer.word;

      return `<button class="answer-btn" data-card-id="${card.id}" data-index="${index}">${answerText}</button>`;
    })
    .join("");

  const cardElement = document.createElement('div');
  cardElement.className = 'card card-new card-center';
  cardElement.id = `card-${card.id}`;
  cardElement.innerHTML = `
    <div class="question-number">Question ${card.id + 1} of 5</div>
    <div class="question">${questionText}</div>
    <div class="answers">${answersHtml}</div>
  `;

  // Add event listeners to answer buttons
  cardElement.querySelectorAll(".answer-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const cardId = parseInt(e.target.getAttribute("data-card-id"));
      const index = parseInt(e.target.getAttribute("data-index"));
      selectAnswer(cardId, index);
    });
  });

  // Initialize quiz container if it doesn't exist
  let container = document.querySelector('.quiz-container');
  if (!container) {
    document.getElementById("output").innerHTML = '<div class="quiz-container"></div>';
    container = document.querySelector('.quiz-container');
  }

  container.appendChild(cardElement);

  // Remove animation class after animation completes
  setTimeout(() => {
    cardElement.classList.remove('card-new');
  }, 500);
};

const updateCardPositions = () => {
  cards.forEach((card, index) => {
    const cardElement = document.getElementById(`card-${card.id}`);
    if (!cardElement) return;

    cardElement.classList.remove('card-center', 'card-left', 'card-right');

    if (index === currentCardIndex) {
      cardElement.classList.add('card-center');
    } else if (index < currentCardIndex) {
      cardElement.classList.add('card-left');
    } else {
      cardElement.classList.add('card-right');
    }
  });
};

const selectAnswer = (cardId, selectedIndex) => {
  console.log("selectAnswer called with cardId:", cardId, "index:", selectedIndex);

  const card = cards.find(c => c.id === cardId);
  if (!card || card.answered) {
    console.error("Card not found or already answered!");
    return;
  }

  const selectedAnswer = card.answers[selectedIndex];
  const isCorrect = selectedAnswer === card.correct;

  card.answered = true;
  card.isCorrect = isCorrect;

  if (isCorrect) {
    score++;
  }
  questionsAnswered++;

  // Show feedback and automatically progress
  showFeedback(card, selectedIndex);
};

// Make functions globally accessible for onclick handlers
window.selectAnswer = selectAnswer;

const showFeedback = (card, selectedIndex) => {
  const cardElement = document.getElementById(`card-${card.id}`);
  const buttons = cardElement.querySelectorAll(".answer-btn");

  // Highlight the selected answer
  buttons[selectedIndex].classList.add(card.isCorrect ? "correct" : "wrong");

  // Highlight the correct answer if user was wrong
  if (!card.isCorrect) {
    const correctIndex = card.answers.indexOf(card.correct);
    buttons[correctIndex].classList.add("correct");
  }

  // Disable all buttons and mark card as answered
  buttons.forEach((btn) => (btn.disabled = true));
  cardElement.classList.add('card-answered');

  // Show feedback message and example phrase
  const feedbackMsg = card.isCorrect ? "Correct! 🎉" : "Wrong! 😞";

  const feedbackHtml = `
    <div class="feedback ${card.isCorrect ? "feedback-correct" : "feedback-wrong"}">
      <div class="feedback-message">${feedbackMsg}</div>
      <div class="word-details">
        <strong>${card.correct.word}</strong> = <em>${card.correct.translation}</em>
        <br/>
        <small>"${card.correct.fnphrase}" = "${card.correct.enphrase}"</small>
      </div>
    </div>
  `;

  cardElement.innerHTML += feedbackHtml;

  // Automatically progress after 2 seconds
  setTimeout(() => {
    if (questionsAnswered < 5) {
      currentCardIndex++;
      generateQuestion();
    } else {
      showFinalScore();
    }
  }, 2000);
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

  // Create final score card
  const finalCard = document.createElement('div');
  finalCard.className = 'card card-center';
  finalCard.innerHTML = `
    <div class="final-score">
      <h2>Quiz Complete!</h2>
      <div class="score-display">${score}/5 (${percentage}%)</div>
      <div class="score-message">${message}</div>
      <button class="restart-btn">Try Again</button>
    </div>
  `;

  // Add event listener to restart button
  finalCard.querySelector(".restart-btn").addEventListener("click", restartQuiz);

  // Replace all cards with final score card
  const container = document.querySelector('.quiz-container');
  container.innerHTML = '';
  container.appendChild(finalCard);
};

const restartQuiz = () => {
  score = 0;
  questionsAnswered = 0;
  cards = [];
  currentCardIndex = 0;

  // Clear the container
  document.getElementById("output").innerHTML = '<div class="quiz-container"></div>';

  // Start with first question
  generateQuestion();
};

// Make globally accessible
window.restartQuiz = restartQuiz;

// Initialize the quiz
(async () => {
  console.log("Initializing quiz...");
  try {
    await getQuizData();
    console.log("Data loaded, generating first question...");

    // Initialize the container
    document.getElementById("output").innerHTML = '<div class="quiz-container"></div>';

    // Generate first question
    generateQuestion();
    console.log("Quiz initialized successfully");
  } catch (error) {
    console.error("Failed to initialize quiz:", error);
    document.getElementById("output").innerHTML = `
      <div class="quiz-container">
        <div class="card card-center">
          <div class="error">Failed to load quiz: ${error.message}</div>
          <button onclick="location.reload()">Retry</button>
        </div>
      </div>
    `;
  }
})();
