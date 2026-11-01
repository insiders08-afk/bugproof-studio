export function testGoal(url: string, prompt: string) {
  return [
      `Navigate to ${url} and perform this QA test:`,
      `User goal: ${prompt}`,
      "Use the visible website interface and interact with elements using their actual visible labels.",
      "Open requested pages, modals and panels. Only inspect the requested workflow; stop before submitting forms, confirming transactions, payments or other irreversible changes.",
      "Observe the page before and after each interaction. Record the actual action, target visibility, before text, after text and whether it succeeded.",
      "Wait for relevant content and images to load before capturing screenshots. Report actual image counts; do not estimate them.",
      "Capture screenshots at meaningful stages of the workflow.",
      "Report the final page's actual visible text, not a summary of previously visited pages.",
      "Include network response information only when it was actually observed.",
      "Treat the user goal as a requirement the website must satisfy, not as an open question.",
      "Set requirement_met to yes only if the requested behaviour actually works on the website; no if it is missing, disabled, unavailable, broken or shows an error; unknown if you could not check it.",
      "Set outcome to success when the requirement is met, failure when it is not met, and blocked or incomplete when you could not finish checking.",
      "In requirement_check, state in one or two sentences what was required and what you actually saw.",
      "If the available evidence is insufficient, report incomplete and requirement_met unknown. Include verbatim final-page text and expected visible quotes.",
      "Return the structured result using the supplied output schema. Leave unavailable optional measurements empty. Do not invent observations or evidence."
    ].join("\n");
}

export function repeatInput(test: { url: string; prompt: string }) {
  return { url: test.url, prompt: test.prompt };
}
