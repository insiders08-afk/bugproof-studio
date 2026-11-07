import { INVESTIGATION_BUDGET } from './run-assessment';
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
      "Use application-specific readiness signals when available, actionability checks, and relevant visible loading indicators. There is no universal hydration flag. Verify the resulting UI state after the action.",
      "Wait only for API responses relevant to the current action if necessary; ignore analytics, background polling and unrelated requests. Network idleness alone is not proof of readiness or success.",
      "Selectively include beforeState and afterState snapshots and telemetry at meaningful transitions or failures: relevant DOM/ARIA fragments, enabled state and bounding boxes, console errors/page exceptions, navigation/mutation events and correlated request IDs, only if actually available. Leave unavailable telemetry absent.",
      `Stop after ${INVESTIGATION_BUDGET.maxActions} actions, ${INVESTIGATION_BUDGET.maxRecoveryAttempts} recovery attempts per obstacle, or ${INVESTIGATION_BUDGET.maxModelCalls} reasoning calls if measurable. Stop repeated identical state+action attempts with no progress after three occurrences; legitimate revisits with progress are allowed.`,
      "Do not enter credentials, reuse authenticated sessions, bypass CAPTCHA, or log tokens, cookies, personal information or request bodies. If authentication or human verification is required, report blocked and explain it without bypassing it.",
      "Treat the user goal as a requirement the website must satisfy, not as an open question.",
      "Set requirement_met to yes only if the requested behaviour actually works on the website; no if it does not satisfy the requirement; unknown if you could not check it. For an explicitly negative test, expected rejection/disabled behaviour can satisfy the requirement; distinguish that from unavailable functionality required to work.",
      "Set outcome to success when the requirement is met, failure when it is not met, and blocked or incomplete when you could not finish checking.",
      "In requirement_check, state in one or two sentences what was required and what you actually saw.",
      "If known, record failure_class and concrete failure_evidence. EXPECTED_NEGATIVE is expected business rejection, AUTH_FAILURE is an authentication obstacle, BOT_CHALLENGE is human/bot verification, TEST_FAILURE is failed test execution or unmet requirement, INFRA_FAILURE is browser/provider infrastructure. Do not label APP_REGRESSION from a 5xx or visual error alone; regression needs independently verified baseline evidence.",
      "If the available evidence is insufficient, report incomplete and requirement_met unknown. Include verbatim final-page text and expected visible quotes.",
      "Return the structured result using the supplied output schema. Leave unavailable optional measurements empty. Do not invent observations or evidence."
    ].join("\n");
}

export function repeatInput(test: { url: string; prompt: string }) {
  return { url: test.url, prompt: test.prompt };
}
