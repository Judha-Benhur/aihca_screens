// screens/QuizScreen.js

import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { quizData } from '../notes/quizData'; // Adjust path as needed
import MatchingTable from '../components/MatchingTable'; // Adjust path based on your folder structure
import { ThemeContext } from '../theme/ThemeContext';

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

export default function QuizScreen() {
  const { theme } = useContext(ThemeContext);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const question = questions[currentQuestionIndex];

  useEffect(() => {
    setQuestions(shuffleArray(quizData));
  }, []);

  const handleOptionPress = (option) => {
    setSelectedOption(option);
    setShowExplanation(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    fadeAnim.setValue(0);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleRestart = () => {
    setQuestions(shuffleArray(quizData));
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    fadeAnim.setValue(0);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.background,
    },
    progress: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 10,
      marginLeft: 2,
    },
    card: {
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 3,
      marginTop: 10,
    },
    topic: {
      fontSize: 15,
      color: theme.textSecondary,
      marginBottom: 8,
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    question: {
      fontSize: 21,
      fontWeight: 'bold',
      marginBottom: 18,
      color: theme.text,
      lineHeight: 28,
    },
    option: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.optionBackground,
      borderRadius: 8,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    optionText: {
      fontSize: 17,
      color: theme.text,
    },
    explanationBox: {
      marginTop: 18,
      padding: 14,
      backgroundColor: theme.explanationBackground,
      borderRadius: 8,
    },
    correctAnswer: {
      fontWeight: 'bold',
      color: 'green',
      fontSize: 16,
    },
    explanation: {
      marginTop: 5,
      color: theme.textSecondary,
      fontSize: 15,
    },
    nextButton: {
      marginTop: 20,
      backgroundColor: theme.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    nextText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: 'bold',
    },
    restartButton: {
      marginTop: 20,
      backgroundColor: 'gray',
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    restartText: {
      color: '#fff',
      fontSize: 16,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      {questions.length === 0 ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
          <Text style={styles.progress} allowFontScaling>
            Question {currentQuestionIndex + 1} of {questions.length}
          </Text>
          <View style={styles.card}>
            <Text style={styles.topic} allowFontScaling>
              {question.topic.name} : {question.topic.subtopic}
            </Text>
            <Text style={styles.question} allowFontScaling>{question.question}</Text>

            {question.tableData?.list1 && question.tableData?.list2 && (
              <MatchingTable data={question.tableData} />
            )}

            {question.options.map((item, index) => (
              <TouchableOpacity
                key={item + index}
                style={[
                  styles.option,
                  selectedOption === item && {
                    backgroundColor:
                      item === question.correctAnswer ? '#d4edda' : '#f8d7da',
                  },
                ]}
                onPress={() => handleOptionPress(item)}
                disabled={showExplanation}
              >
                <Text style={styles.optionText} allowFontScaling>{item}</Text>
              </TouchableOpacity>
            ))}

            {showExplanation && (
              <Animated.View style={[styles.explanationBox, { opacity: fadeAnim }]}>
                <Text style={styles.correctAnswer} allowFontScaling>
                  Correct: {question.correctAnswer}
                </Text>
                <Text style={styles.explanation} allowFontScaling>{question.explanation}</Text>
              </Animated.View>
            )}

            {showExplanation && (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextText} allowFontScaling>
                  {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Finish'}
                </Text>
              </TouchableOpacity>
            )}

            {showExplanation && currentQuestionIndex === questions.length - 1 && (
              <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
                <Text style={styles.restartText} allowFontScaling>Restart</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}