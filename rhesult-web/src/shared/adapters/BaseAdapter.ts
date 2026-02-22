/**
 * Adapter Pattern Implementation
 * Transforms external data into domain models and vice versa
 * Isolates business logic from external data structures
 */

/**
 * Defines the contract for data transformation
 * @template TInput - Input data type
 * @template TOutput - Output data type
 */
export interface IAdapter<TInput, TOutput> {
  /**
   * Adapts input data to output format
   */
  adapt(input: TInput): TOutput;

  /**
   * Reverse adaptation (optional)
   */
  adaptReverse?(output: TOutput): TInput;
}

/**
 * Base adapter class implementing the Adapter pattern
 */
export abstract class BaseAdapter<TInput, TOutput> implements IAdapter<TInput, TOutput> {
  abstract adapt(input: TInput): TOutput;

  adaptReverse?(output: TOutput): TInput;

  /**
   * Adapts an array of inputs
   */
  adaptMany(inputs: TInput[]): TOutput[] {
    return inputs.map((input) => this.adapt(input));
  }

  /**
   * Safely adapts with error handling
   */
  adaptSafe(input: TInput | null | undefined): TOutput | null {
    if (input === null || input === undefined) {
      return null;
    }
    return this.adapt(input);
  }
}
