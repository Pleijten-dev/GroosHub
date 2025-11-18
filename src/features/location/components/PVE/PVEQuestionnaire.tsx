// src/features/location/components/PVE/PVEQuestionnaire.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';

interface PVEAnswer {
  total?: number;
  apartments?: number;
  commercial?: number;
  hospitality?: number;
  social?: number;
  communal?: number;
  offices?: number;
}

interface PVEQuestionnaireProps {
  locale: Locale;
}

interface Question {
  id: keyof PVEAnswer;
  nl: string;
  en: string;
  color: string;
}

const QUESTIONS: Question[] = [
  { id: 'total', nl: 'Wat is de totale bruto vloer oppervlakte van uw project?', en: 'What is the total gross floor area of your project?', color: '#e5e7eb' },
  { id: 'apartments', nl: 'Hoeveel m² woningen wilt u realiseren?', en: 'How many m² of apartments do you want to realize?', color: '#48806a' },
  { id: 'commercial', nl: 'Hoeveel m² commercieel wilt u realiseren?', en: 'How many m² of commercial do you want to realize?', color: '#477638' },
  { id: 'hospitality', nl: 'Hoeveel m² horeca wilt u realiseren?', en: 'How many m² of hospitality do you want to realize?', color: '#8a976b' },
  { id: 'social', nl: 'Hoeveel m² maatschappelijk wilt u realiseren?', en: 'How many m² of social do you want to realize?', color: '#0c211a' },
  { id: 'communal', nl: 'Hoeveel m² gemeenschappelijk wilt u realiseren?', en: 'How many m² of communal space do you want to realize?', color: '#a3b18a' },
  { id: 'offices', nl: 'Hoeveel m² kantoren wilt u realiseren?', en: 'How many m² of offices space do you want to realize?', color: '#588157' }
];

export const PVEQuestionnaire: React.FC<PVEQuestionnaireProps> = ({ locale }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PVEAnswer>({});
  const [inputValue, setInputValue] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isFirstQuestion = currentQuestionIndex === 0;

  // Calculate totals and remaining
  const { usedM2, totalM2, remainingM2 } = useMemo(() => {
    const total = answers.total || 0;
    const used = (answers.apartments || 0) +
                 (answers.commercial || 0) +
                 (answers.hospitality || 0) +
                 (answers.social || 0) +
                 (answers.communal || 0) +
                 (answers.offices || 0);

    // If total was specified, calculate remaining
    const remaining = answers.total ? total - used : 0;

    return {
      usedM2: used,
      totalM2: answers.total || used,
      remainingM2: remaining
    };
  }, [answers]);

  // Calculate grid squares for each function
  const gridData = useMemo(() => {
    const total = totalM2 || 1; // Avoid division by zero
    const data: { color: string; count: number; label: string }[] = [];

    QUESTIONS.slice(1).forEach((question) => {
      const value = answers[question.id] || 0;
      if (value > 0) {
        const count = Math.round((value / total) * 200);
        data.push({
          color: question.color,
          count,
          label: question[locale]
        });
      }
    });

    return data;
  }, [answers, totalM2, locale]);

  const handleSubmit = () => {
    const value = parseInt(inputValue);

    if (inputValue.trim() === '') {
      // Skip this question
      handleNext();
      return;
    }

    if (isNaN(value) || value < 0) {
      return; // Invalid input
    }

    // Validation: if total is set and not first question, check remaining
    if (answers.total && !isFirstQuestion) {
      if (value > remainingM2) {
        alert(locale === 'nl'
          ? `U kunt maximaal ${remainingM2} m² invoeren (resterende capaciteit)`
          : `You can enter a maximum of ${remainingM2} m² (remaining capacity)`
        );
        return;
      }
    }

    // Save answer
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    setInputValue('');
    handleNext();
  };

  const handleNext = () => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Complete
      setIsComplete(true);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Restore previous answer to input
      const prevQuestion = QUESTIONS[currentQuestionIndex - 1];
      const prevAnswer = answers[prevQuestion.id];
      setInputValue(prevAnswer ? String(prevAnswer) : '');
    }
  };

  const handleSkip = () => {
    setInputValue('');
    handleNext();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Render 200 squares grid
  const renderGrid = () => {
    const squares: React.ReactElement[] = [];
    let currentIndex = 0;

    gridData.forEach(({ color, count }) => {
      for (let i = 0; i < count; i++) {
        squares.push(
          <div
            key={currentIndex++}
            className="w-full h-full rounded-sm"
            style={{ backgroundColor: color }}
          />
        );
      }
    });

    // Fill remaining with gray
    while (currentIndex < 200) {
      squares.push(
        <div
          key={currentIndex++}
          className="w-full h-full bg-gray-200 rounded-sm"
        />
      );
    }

    return squares;
  };

  if (isComplete) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-base">
            {locale === 'nl' ? 'Programma Overzicht' : 'Program Overview'}
          </h2>
          <div className="inline-block">
            <div
              className="border-2 border-gray-300 rounded-lg p-2 bg-white"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(20, 1fr)',
                gap: '4px',
                width: '500px',
                height: '250px'
              }}
            >
              {renderGrid()}
            </div>
            <div className="mt-base text-left">
              <p className="text-lg font-semibold text-text-primary mb-sm">
                {locale === 'nl' ? 'Totaal:' : 'Total:'} {totalM2.toLocaleString()} m²
              </p>
              {gridData.map((item, idx) => {
                const questionId = QUESTIONS.slice(1).find(q => q.color === item.color)?.id;
                const value = questionId ? answers[questionId] : 0;
                return (
                  <div key={idx} className="flex items-center gap-2 mb-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-text-secondary">
                      {QUESTIONS.find(q => q.id === questionId)?.[locale]}: {value?.toLocaleString()} m²
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 p-lg">
      <div className="w-full max-w-6xl flex gap-8 items-start">
        {/* Left side - Question */}
        <div className="flex-1">
          <div className="mb-base">
            <p className="text-sm text-text-muted mb-2">
              {locale === 'nl' ? 'Vraag' : 'Question'} {currentQuestionIndex + 1} / {QUESTIONS.length}
            </p>
            <h2 className="text-2xl font-bold text-text-primary mb-base">
              {currentQuestion[locale]}
            </h2>
          </div>

          <div className="flex gap-2 mb-base">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={locale === 'nl' ? 'Voer aantal m² in...' : 'Enter m²...'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min="0"
              step="1"
            />
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-gradient-3-mid text-gray-900 font-medium rounded-full hover:opacity-90 transition-opacity"
            >
              {locale === 'nl' ? 'Volgende' : 'Next'}
            </button>
          </div>

          <div className="flex gap-2">
            {currentQuestionIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-gray-300 rounded-full transition-colors"
              >
                ← {locale === 'nl' ? 'Vorige' : 'Previous'}
              </button>
            )}
            {!isFirstQuestion && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-gray-300 rounded-full transition-colors"
              >
                {locale === 'nl' ? 'Overslaan' : 'Skip'} →
              </button>
            )}
          </div>

          {/* Status display */}
          <div className="mt-base p-4 bg-white rounded-lg border border-gray-200">
            {answers.total ? (
              <>
                <p className="text-sm text-text-secondary mb-1">
                  {locale === 'nl' ? 'Totaal beschikbaar:' : 'Total available:'} {answers.total.toLocaleString()} m²
                </p>
                <p className="text-sm text-text-secondary mb-1">
                  {locale === 'nl' ? 'Gebruikt:' : 'Used:'} {usedM2.toLocaleString()} m²
                </p>
                <p className="text-lg font-semibold text-primary">
                  {locale === 'nl' ? 'Resterend:' : 'Remaining:'} {remainingM2.toLocaleString()} m²
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold text-primary">
                {locale === 'nl' ? 'Totaal:' : 'Total:'} {usedM2.toLocaleString()} m²
              </p>
            )}
          </div>
        </div>

        {/* Right side - Grid visualization */}
        <div className="flex-shrink-0">
          <div
            className="border-2 border-gray-300 rounded-lg p-2 bg-white shadow-lg"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(20, 1fr)',
              gap: '4px',
              width: '400px',
              height: '400px'
            }}
          >
            {renderGrid()}
          </div>
          <p className="text-xs text-text-muted text-center mt-2">
            {locale === 'nl' ? '1 vierkant = 1/200 van totaal' : '1 square = 1/200 of total'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PVEQuestionnaire;
