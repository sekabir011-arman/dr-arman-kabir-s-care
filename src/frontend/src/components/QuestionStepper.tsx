import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Rows3,
} from "lucide-react";
import React, { useState } from "react";

interface Question {
  q: string;
  options: string[];
}

interface QuestionStepperProps {
  questions?: (Question | string)[];
  answers?: string[];
  onChange: (index: number, value: string) => void;
  numberOffset?: number;
}

// Color palette for options - each option gets a distinct color based on index
const OPTION_PALETTE = [
  {
    base: "bg-blue-100 text-blue-800 border-blue-300",
    active: "bg-blue-500 text-white border-blue-500 shadow-sm",
  },
  {
    base: "bg-green-100 text-green-800 border-green-300",
    active: "bg-green-500 text-white border-green-500 shadow-sm",
  },
  {
    base: "bg-amber-100 text-amber-800 border-amber-300",
    active: "bg-amber-500 text-white border-amber-500 shadow-sm",
  },
  {
    base: "bg-purple-100 text-purple-800 border-purple-300",
    active: "bg-purple-500 text-white border-purple-500 shadow-sm",
  },
  {
    base: "bg-rose-100 text-rose-800 border-rose-300",
    active: "bg-rose-500 text-white border-rose-500 shadow-sm",
  },
  {
    base: "bg-cyan-100 text-cyan-800 border-cyan-300",
    active: "bg-cyan-500 text-white border-cyan-500 shadow-sm",
  },
  {
    base: "bg-orange-100 text-orange-800 border-orange-300",
    active: "bg-orange-500 text-white border-orange-500 shadow-sm",
  },
  {
    base: "bg-teal-100 text-teal-800 border-teal-300",
    active: "bg-teal-500 text-white border-teal-500 shadow-sm",
  },
  {
    base: "bg-indigo-100 text-indigo-800 border-indigo-300",
    active: "bg-indigo-500 text-white border-indigo-500 shadow-sm",
  },
  {
    base: "bg-lime-100 text-lime-800 border-lime-300",
    active: "bg-lime-600 text-white border-lime-600 shadow-sm",
  },
];

export default function QuestionStepper({
  questions = [],
  answers = [],
  onChange,
  numberOffset = 0,
}: QuestionStepperProps) {
  const [stepMode, setStepMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const total = questions.length;

  const handleOptionClick = (idx: number, option: string) => {
    onChange(idx, option);
    if (stepMode && idx === currentStep && currentStep < total - 1) {
      setTimeout(() => setCurrentStep((s) => s + 1), 300);
    }
  };

  const renderQuestion = (item: Question | string, idx: number) => {
    const question = typeof item === "string" ? item : item.q;
    const options = typeof item === "object" ? item.options || [] : [];
    const answer = answers[idx] || "";
    const isAnswered = answer.trim() !== "";
    const isEditing = editingIdx === idx;

    return (
      <div
        key={idx}
        className={`rounded-xl border-2 transition-all ${
          isAnswered
            ? "border-teal-300 bg-teal-50/50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-start gap-3 p-3 sm:p-4">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
              isAnswered
                ? "bg-teal-500 text-white"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {isAnswered ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              numberOffset + idx + 1
            )}
          </div>
          <p className="text-slate-800 font-semibold text-sm leading-relaxed pt-0.5 flex-1">
            {question}
          </p>
        </div>

        {options.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 px-3 sm:px-4 pb-3">
            {options.map((option, optIdx) => {
              const colors = OPTION_PALETTE[optIdx % OPTION_PALETTE.length];
              const isSelected = answer === option;
              return (
                <Badge
                  key={option}
                  variant="outline"
                  className={`cursor-pointer text-xs sm:text-sm py-1 sm:py-1.5 px-2 sm:px-3 transition-all border font-medium min-h-[36px] flex items-center ${
                    isSelected ? colors.active : colors.base
                  }`}
                  onClick={() => handleOptionClick(idx, option)}
                >
                  {option}
                </Badge>
              );
            })}
          </div>
        )}

        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          {isAnswered && !isEditing ? (
            <button
              type="button"
              className="flex items-center gap-2 bg-teal-100 border border-teal-300 rounded-lg px-3 py-2 cursor-pointer hover:bg-teal-200 transition-colors group w-full text-left"
              onClick={() => setEditingIdx(idx)}
            >
              <span className="text-teal-800 font-medium text-sm flex-1">
                ✓ {answer}
              </span>
              <span className="text-xs text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to edit
              </span>
            </button>
          ) : (
            <Input
              value={answer}
              onChange={(e) => onChange(idx, e.target.value)}
              onBlur={() => setEditingIdx(null)}
              autoFocus={isEditing}
              placeholder={
                options.length > 0
                  ? "Or type a custom answer..."
                  : "Type your answer here..."
              }
              className="h-10 bg-white border-slate-300 focus:border-teal-500 text-sm"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setStepMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              !stepMode
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            All
          </button>
          <button
            type="button"
            onClick={() => {
              setStepMode(true);
              setCurrentStep(0);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              stepMode
                ? "bg-white text-slate-800 shadow"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Rows3 className="h-3.5 w-3.5" />
            One by One
          </button>
        </div>
      </div>

      {stepMode ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / total) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium shrink-0">
              {currentStep + 1} / {total}
            </span>
          </div>

          {total > 0 && renderQuestion(questions[currentStep], currentStep)}

          <div className="flex items-center justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="h-9 px-4 min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>

            <div className="flex gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={`dot-${typeof q === "string" ? q : q.q}-${idx}`}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentStep
                      ? "bg-teal-600 scale-125"
                      : (answers[idx] || "").trim()
                        ? "bg-teal-300"
                        : "bg-slate-300"
                  }`}
                />
              ))}
            </div>

            <Button
              type="button"
              variant={currentStep === total - 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentStep((s) => Math.min(total - 1, s + 1))}
              disabled={currentStep === total - 1}
              className={`h-9 px-4 min-h-[44px] ${
                currentStep === total - 1 ? "bg-teal-600 hover:bg-teal-700" : ""
              }`}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((item, idx) => renderQuestion(item, idx))}
        </div>
      )}
    </div>
  );
}
