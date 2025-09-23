console.log("starting...");

// import json data from words file


// Store quiz data
let quizData = [];
let cards = [];
let currentCardIndex = 0;
let score = 0;
let questionsAnswered = 0;

// Leitner System Configuration
const LEITNER_LEVELS = {
  0: { interval: 0, description: "New/Failed" }, // Review immediately
  1: { interval: 1, description: "Level 1" },   // Review after 1 day
  2: { interval: 3, description: "Level 2" },   // Review after 3 days
  3: { interval: 7, description: "Level 3" },   // Review after 1 week
  4: { interval: 14, description: "Level 4" },  // Review after 2 weeks
  5: { interval: 30, description: "Level 5" },  // Review after 1 month
  6: { interval: 60, description: "Mastered" }  // Review after 2 months
};

// Local Storage Management for Leitner System
const LeitnerStorage = {
  getWordData(word) {
    const data = localStorage.getItem(`leitner_${word}`);
    return data ? JSON.parse(data) : {
      level: 0,
      correctCount: 0,
      incorrectCount: 0,
      lastReviewed: null,
      nextReview: Date.now(),
      history: []
    };
  },

  updateWordData(word, isCorrect) {
    const data = this.getWordData(word);
    const now = Date.now();
    
    data.lastReviewed = now;
    data.history.push({
      timestamp: now,
      correct: isCorrect,
      level: data.level
    });

    if (isCorrect) {
      data.correctCount++;
      // Move up a level (max level 6)
      data.level = Math.min(data.level + 1, 6);
    } else {
      data.incorrectCount++;
      // Reset to level 0 on incorrect answer
      data.level = 0;
    }

    // Calculate next review date based on new level
    const intervalDays = LEITNER_LEVELS[data.level].interval;
    data.nextReview = now + (intervalDays * 24 * 60 * 60 * 1000);

    localStorage.setItem(`leitner_${word}`, JSON.stringify(data));
    return data;
  },

  getWordsForReview(allWords, maxWords = 5) {
    const now = Date.now();
    const wordsWithData = allWords.map(word => ({
      ...word,
      leitnerData: this.getWordData(word.word),
    }));

    // Filter words that need review (nextReview <= now)
    const wordsNeedingReview = wordsWithData.filter(item => 
      item.leitnerData.nextReview <= now
    );

    // Sort by priority: lower level first, then by how overdue they are
    wordsNeedingReview.sort((a, b) => {
      if (a.leitnerData.level !== b.leitnerData.level) {
        return a.leitnerData.level - b.leitnerData.level;
      }
      return a.leitnerData.nextReview - b.leitnerData.nextReview;
    });

    return wordsNeedingReview.slice(0, maxWords);
  },

  getAllStats() {
    const stats = {
      totalWords: 0,
      byLevel: {},
      recentActivity: []
    };

    // Initialize level counts
    Object.keys(LEITNER_LEVELS).forEach(level => {
      stats.byLevel[level] = 0;
    });

    // Scan all localStorage for leitner data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('leitner_')) {
        const data = JSON.parse(localStorage.getItem(key));
        stats.totalWords++;
        stats.byLevel[data.level]++;
        
        // Add recent activity
        if (data.history && data.history.length > 0) {
          const recentEntries = data.history.slice(-5);
          stats.recentActivity.push(...recentEntries.map(entry => ({
            word: key.replace('leitner_', ''),
            ...entry
          })));
        }
      }
    }

    // Sort recent activity by timestamp
    stats.recentActivity.sort((a, b) => b.timestamp - a.timestamp);
    stats.recentActivity = stats.recentActivity.slice(0, 20);

    return stats;
  }
};



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

  if (!quizData || quizData.length === 0) {
    console.error("No quiz data available!");
    document.getElementById("output").innerHTML = `
      <div class="quiz-container">
        <div class="error">Error: No quiz data loaded. Please refresh the page.</div>
      </div>
    `;
    return;
  }

  // Use Leitner system to get words that need review
  const wordsForReview = LeitnerStorage.getWordsForReview(quizData, 10);

  // If no words need review, fall back to random selection
  const availableWords = wordsForReview.length > 0 ? wordsForReview : quizData;

  console.log(
    `Using ${
      wordsForReview.length > 0 ? "Leitner-selected" : "random"
    } words for review`
  );

  // Randomly decide if we show word->translation or translation->word
  const showWord = Math.random() > 0.5;

  // Pick a correct answer from available words
  const correctAnswer =
    availableWords[Math.floor(Math.random() * availableWords.length)];

  // Pick 2 random wrong answers from the full dataset
  const wrongAnswers = quizData
    .filter((item) => item.word !== correctAnswer.word)
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
    isCorrect: null,
  };

  cards.push(newCard);
  createCardElement(newCard);
  updateCardPositions();
};

const createCardElement = (card) => {
  const questionText =
    card.type === "word-to-translation"
      ? `"<strong>${card.question}</strong>"`
      : `"<strong>${card.question}</strong>"`;

  const answersHtml = card.answers
    .map((answer, index) => {
      const answerText =
        card.type === "word-to-translation" ? answer.translation : answer.word;

      return `<button class="answer-btn" data-card-id="${card.id}" data-index="${index}">${answerText}</button>`;
    })
    .join("");

  const cardElement = document.createElement("div");
  cardElement.className = "card card-new card-center";
  cardElement.id = `card-${card.id}`;
  // Get current stats for progress display
  const stats = LeitnerStorage.getAllStats();
  const wordsReady = LeitnerStorage.getWordsForReview(quizData, 1000).length;

  cardElement.innerHTML = `
    <div class="card-header">
      <div class="question-number">Question ${card.id + 1}</div>
      <div class="progress-info">
        <small>${
          stats.totalWords
        } words practiced | ${wordsReady} due for review</small>
        <button class="stats-mini-btn" onclick="showDetailedStats()" title="View detailed statistics">📊</button>
      </div>
    </div>
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
  let container = document.querySelector(".quiz-container");
  if (!container) {
    document.getElementById("output").innerHTML =
      '<div class="quiz-container"></div>';
    container = document.querySelector(".quiz-container");
  }

  container.appendChild(cardElement);

  // Remove animation class after animation completes
  setTimeout(() => {
    cardElement.classList.remove("card-new");
  }, 500);
};

const updateCardPositions = () => {
  cards.forEach((card, index) => {
    const cardElement = document.getElementById(`card-${card.id}`);
    if (!cardElement) return;

    cardElement.classList.remove("card-center", "card-left", "card-right");

    if (index === currentCardIndex) {
      cardElement.classList.add("card-center");
    } else if (index < currentCardIndex) {
      cardElement.classList.add("card-left");
    } else {
      cardElement.classList.add("card-right");
    }
  });
};

const selectAnswer = (cardId, selectedIndex) => {
  console.log(
    "selectAnswer called with cardId:",
    cardId,
    "index:",
    selectedIndex
  );

  const card = cards.find((c) => c.id === cardId);
  if (!card || card.answered) {
    console.error("Card not found or already answered!");
    return;
  }

  const selectedAnswer = card.answers[selectedIndex];
  const isCorrect = selectedAnswer === card.correct;

  card.answered = true;
  card.isCorrect = isCorrect;

  // Update Leitner system data
  const updatedLeitnerData = LeitnerStorage.updateWordData(
    card.correct.word,
    isCorrect
  );
  card.leitnerData = updatedLeitnerData;

  console.log(
    `Word "${card.correct.word}" ${
      isCorrect ? "correct" : "incorrect"
    }, now at level ${updatedLeitnerData.level}`
  );

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
  cardElement.classList.add("card-answered");

  // Show feedback message and example phrase
  const feedbackMsg = card.isCorrect ? "Correct! 🎉" : "Wrong! 😞";

  // Get Leitner level info
  const leitnerInfo = card.leitnerData
    ? `<div class="leitner-info">
      <small>📚 ${LEITNER_LEVELS[card.leitnerData.level].description} 
      ${
        card.leitnerData.level > 0
          ? `(${card.leitnerData.correctCount}✓ ${card.leitnerData.incorrectCount}✗)`
          : ""
      }
      </small>
    </div>`
    : "";

  const feedbackHtml = `
    <div class="feedback ${
      card.isCorrect ? "feedback-correct" : "feedback-wrong"
    }">
      <div class="feedback-message">${feedbackMsg}</div>
      <div class="word-details">
        <strong>${card.correct.word}</strong> = <em>${
    card.correct.translation
  }</em>
        <br/>
        <small>"${card.correct.fnphrase}" = "${card.correct.enphrase}"</small>
        ${leitnerInfo}
      </div>
    </div>
  `;

  cardElement.innerHTML += feedbackHtml;

  // Progress immediately if correct, or after 2 seconds if wrong
  const delay = card.isCorrect ? 0 : 2000;
  setTimeout(() => {
    currentCardIndex++;
    generateQuestion();
  }, delay);
};

const continueLearning = () => {
  // Clear the container
  document.getElementById("output").innerHTML =
    '<div class="quiz-container"></div>';

  // Continue with next question
  generateQuestion();
};

const showDetailedStats = () => {
  const stats = LeitnerStorage.getAllStats();

  // Calculate review schedule
  const now = Date.now();
  const reviewSchedule = {};
  const today = new Date().toDateString();

  // Scan localStorage for review dates
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("leitner_")) {
      const data = JSON.parse(localStorage.getItem(key));
      const reviewDate = new Date(data.nextReview).toDateString();

      if (!reviewSchedule[reviewDate]) {
        reviewSchedule[reviewDate] = 0;
      }
      reviewSchedule[reviewDate]++;
    }
  }

  // Create detailed stats display
  const recentActivityHtml = stats.recentActivity
    .slice(0, 10)
    .map(
      (activity) =>
        `<div class="activity-item ${
          activity.correct ? "correct" : "incorrect"
        }">
      <span class="word">${activity.word}</span>
      <span class="result">${activity.correct ? "✓" : "✗"}</span>
      <span class="time">${new Date(activity.timestamp).toLocaleString()}</span>
    </div>`
    )
    .join("");

  const statsCard = document.createElement("div");
  statsCard.className = "card card-center stats-card";
  statsCard.innerHTML = `
    <div class="detailed-stats">
      <h2>📊 Detailed Learning Stats</h2>
      
      <div class="stat-section">
        <h3>Words Due Today: ${reviewSchedule[today] || 0}</h3>
      </div>

      <div class="stat-section">
        <h3>Level Distribution</h3>
        ${Object.keys(LEITNER_LEVELS)
          .map(
            (level) =>
              `<div class="level-detail">
            <div class="level-info">
              <span class="level-name">Level ${level} - ${
                LEITNER_LEVELS[level].description
              }</span>
              <span class="level-interval">(Review every ${
                LEITNER_LEVELS[level].interval
              } days)</span>
            </div>
            <div class="level-count-large">${
              stats.byLevel[level] || 0
            } words</div>
          </div>`
          )
          .join("")}
      </div>

      <div class="stat-section">
        <h3>Recent Activity</h3>
        <div class="recent-activity">
          ${
            recentActivityHtml ||
            '<div class="no-activity">No recent activity</div>'
          }
        </div>
      </div>
      
      <button class="back-btn">Continue Learning</button>
    </div>
  `;

  statsCard.querySelector(".back-btn").addEventListener("click", () => {
    // Continue learning
    continueLearning();
  });

  const container = document.querySelector(".quiz-container");
  container.innerHTML = "";
  container.appendChild(statsCard);
};

// Make globally accessible
window.continueLearning = continueLearning;
window.showDetailedStats = showDetailedStats;

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
