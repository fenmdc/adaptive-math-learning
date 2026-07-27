"use client";

import Link from "next/link";
import { useState } from "react";

import type { ContentLanguage, LearningMode } from "@/packages/learning-catalog";
import type { PracticeProblem } from "@/packages/problem-bank/types";

export default function SectionPractice({
  language,
  mode,
  problems,
  sectionTitle,
  total,
}: {
  language: ContentLanguage;
  mode: LearningMode;
  problems: PracticeProblem[];
  sectionTitle: string;
  total: number;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hintVisible, setHintVisible] = useState(mode === "learn");
  const [correct, setCorrect] = useState(0);
  const problem = problems[index];
  const isChinese = language === "zh";

  if (!problem) {
    return <div className="section-practice empty-workspace"><h1>{isChinese ? "这个版块暂无可自动评分题目" : "No auto-gradable problems in this section"}</h1><Link href={`/library?language=${language}&mode=${mode}`}>{isChinese ? "返回题库" : "Back to library"}</Link></div>;
  }

  const isCorrect = selected === problem.answer;

  function submit() {
    if (!selected || submitted) return;
    setSubmitted(true);
    if (isCorrect) setCorrect((value) => value + 1);
  }

  function next() {
    setIndex((value) => (value + 1) % problems.length);
    setSelected("");
    setSubmitted(false);
    setHintVisible(mode === "learn");
  }

  return (
    <div className="section-practice">
      <header className="section-practice-header">
        <div><p>{mode === "learn" ? (isChinese ? "引导学习" : "Guided learning") : (isChinese ? "专项练习" : "Focused practice")}</p><h1>{sectionTitle}</h1><span>{isChinese ? `该版块共 ${total.toLocaleString()} 道可用题目` : `${total.toLocaleString()} available problems in this section`}</span></div>
        <div><strong>{index + 1}/{problems.length}</strong><span>{isChinese ? `答对 ${correct}` : `${correct} correct`}</span><Link href={`/library?language=${language}&mode=${mode}`}>{isChinese ? "更换版块" : "Change section"}</Link></div>
      </header>

      <div className="section-practice-layout">
        <article className="section-question">
          <div className="section-question-meta"><span>{problem.course}</span><strong>{problem.conceptLabel}</strong><small>{isChinese ? `难度 ${problem.difficulty}` : `Difficulty ${problem.difficulty}`}</small></div>
          <div className="section-question-body">
            <h2>{problem.statement}</h2>
            {problem.asset ? <img className="problem-asset" src={problem.asset.url} alt={problem.asset.alt} /> : null}
            {hintVisible && !submitted ? <div className="hint-panel"><strong>{isChinese ? "思路提示" : "Strategy hint"}</strong><p>{problem.hint}</p></div> : null}
            {!hintVisible && !submitted ? <button className="hint-button" onClick={() => setHintVisible(true)} type="button">{isChinese ? "需要提示？" : "Need a hint?"}</button> : null}
            <div className="answer-list" role="group" aria-label={isChinese ? "答案选项" : "Answer choices"}>
              {problem.choices.map((choice, choiceIndex) => {
                const className = submitted
                  ? choice === problem.answer ? "is-correct" : choice === selected ? "is-wrong" : ""
                  : choice === selected ? "is-selected" : "";
                return <button aria-pressed={choice === selected} className={className} disabled={submitted} key={`${choiceIndex}:${choice}`} onClick={() => setSelected(choice)} type="button"><span>{String.fromCharCode(65 + choiceIndex)}</span><strong>{choice}</strong></button>;
              })}
            </div>
            {submitted ? <section className={`learning-feedback ${isCorrect ? "is-correct" : "is-review"}`} aria-live="polite"><div className="feedback-verdict"><span>{isCorrect ? (isChinese ? "回答正确" : "Correct") : (isChinese ? "需要复习" : "Review")}</span><strong>{isChinese ? `正确答案：${problem.answer}` : `Correct answer: ${problem.answer}`}</strong></div><div className="feedback-grid"><div><span>{isChinese ? "解析" : "Explanation"}</span><p>{problem.explanation}</p></div><div><span>{isChinese ? "注意" : "Watch for"}</span><p>{problem.misconceptionFeedback}</p></div></div></section> : null}
          </div>
          <footer className="question-actions"><span>{selected ? `${isChinese ? "已选择" : "Selected"}: ${selected}` : (isChinese ? "请选择答案" : "Choose an answer")}</span>{submitted ? <button className="primary-button" onClick={next} type="button">{isChinese ? "下一题" : "Next problem"}</button> : <button className="primary-button" disabled={!selected} onClick={submit} type="button">{isChinese ? "检查答案" : "Check answer"}</button>}</footer>
        </article>

        <aside className="section-guide">
          <span>{mode === "learn" ? (isChinese ? "学习模式" : "Learning mode") : (isChinese ? "练习模式" : "Practice mode")}</span>
          <h2>{mode === "learn" ? (isChinese ? "先理解，再作答" : "Understand before answering") : (isChinese ? "独立完成，再看解析" : "Solve first, review after")}</h2>
          <p>{mode === "learn" ? (isChinese ? "每题默认显示思路提示，作答后给出完整解析。" : "A strategy hint is shown before each answer, followed by a full explanation.") : (isChinese ? "提示默认收起，提交后再显示答案与错因。" : "Hints stay hidden by default; answers and feedback appear after submission.")}</p>
          <dl><div><dt>{isChinese ? "课程" : "Course"}</dt><dd>{problem.course}</dd></div><div><dt>{isChinese ? "题型" : "Format"}</dt><dd>{problem.answerType?.replaceAll("_", " ")}</dd></div><div><dt>{isChinese ? "来源" : "Source"}</dt><dd>{problem.source}</dd></div></dl>
        </aside>
      </div>
    </div>
  );
}
