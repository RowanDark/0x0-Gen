import type { TransformStep, TransformResult, TransformStepResult } from "./types.js";
import { getTransform } from "./transforms.js";
import { createLogger } from "@0x0-gen/logger";

const logger = createLogger("decoder:pipeline");

export function executePipeline(
  input: string,
  steps: TransformStep[],
): TransformResult {
  const stepResults: TransformStepResult[] = [];
  let currentInput = input;

  for (const step of steps) {
    const fn = getTransform(step.type, step.direction);

    if (!fn) {
      const errorMsg = `Transform '${step.type}' does not support direction '${step.direction}'`;
      logger.warn(errorMsg);
      stepResults.push({
        type: step.type,
        direction: step.direction,
        input: currentInput,
        output: "",
        success: false,
        error: errorMsg,
      });
      return {
        input,
        output: currentInput,
        steps: stepResults,
        success: false,
        error: errorMsg,
      };
    }

    try {
      const output = fn(currentInput, step.options);
      stepResults.push({
        type: step.type,
        direction: step.direction,
        input: currentInput,
        output,
        success: true,
        error: null,
      });
      currentInput = output;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`Transform ${step.type}:${step.direction} failed: ${errorMsg}`);
      stepResults.push({
        type: step.type,
        direction: step.direction,
        input: currentInput,
        output: "",
        success: false,
        error: errorMsg,
      });
      return {
        input,
        output: currentInput,
        steps: stepResults,
        success: false,
        error: errorMsg,
      };
    }
  }

  return {
    input,
    output: currentInput,
    steps: stepResults,
    success: true,
    error: null,
  };
}
