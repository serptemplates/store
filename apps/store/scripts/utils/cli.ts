export interface BooleanFlagOptions {
  name: string;
  alias?: string;
  negated?: string;
  defaultValue?: boolean;
}

export interface ValueFlagOptions {
  name: string;
  alias?: string;
}

export interface NumberFlagOptions extends ValueFlagOptions {
  radix?: number;
}

export interface CliParser {
  consumeBoolean: (options: BooleanFlagOptions) => boolean;
  consumeString: (options: ValueFlagOptions) => string | undefined;
  consumeNumber: (options: NumberFlagOptions) => number | undefined;
  rest: () => string[];
}

function matchLongFlag(token: string, name: string): { matched: boolean; value?: string } {
  if (!token.startsWith("--")) {
    return { matched: false };
  }

  const withoutPrefix = token.slice(2);
  if (withoutPrefix === name) {
    return { matched: true };
  }

  if (withoutPrefix.startsWith(`${name}=`)) {
    return { matched: true, value: withoutPrefix.slice(name.length + 1) };
  }

  return { matched: false };
}

function matchShortFlag(token: string, alias: string): { matched: boolean; value?: string } {
  if (!token.startsWith("-") || token.startsWith("--")) {
    return { matched: false };
  }

  const withoutPrefix = token.slice(1);
  if (withoutPrefix === alias) {
    return { matched: true };
  }

  if (withoutPrefix.startsWith(`${alias}=`)) {
    return { matched: true, value: withoutPrefix.slice(alias.length + 1) };
  }

  return { matched: false };
}

export function createCliParser(argv: string[]): CliParser {
  const remaining = [...argv];

  const removeIndices = (indices: number[]): void => {
    indices
      .sort((a, b) => b - a)
      .forEach((index) => {
        remaining.splice(index, 1);
      });
  };

  const takeValue = (index: number): string | undefined => {
    const token = remaining[index];
    if (!token) {
      return undefined;
    }
    return token.startsWith("-") ? undefined : remaining.splice(index, 1)[0];
  };

  const consumeBoolean = ({ name, alias, negated, defaultValue = false }: BooleanFlagOptions): boolean => {
    let value = defaultValue;
    const indicesToRemove: number[] = [];

    for (let index = 0; index < remaining.length; index += 1) {
      const token = remaining[index];

      if (negated) {
        const negatedMatch = matchLongFlag(token, negated);
        if (negatedMatch.matched) {
          const boolValue = negatedMatch.value ?? "true";
          value = !(boolValue.toLowerCase() !== "false" && boolValue !== "0");
          indicesToRemove.push(index);
          continue;
        }
      }

      const match = matchLongFlag(token, name);
      if (match.matched) {
        const boolValue = match.value ?? "true";
        value = !(boolValue.toLowerCase() === "false" || boolValue === "0");
        indicesToRemove.push(index);
        continue;
      }

      if (alias) {
        const aliasMatch = matchShortFlag(token, alias);
        if (aliasMatch.matched) {
          const boolValue = aliasMatch.value ?? "true";
          value = !(boolValue.toLowerCase() === "false" || boolValue === "0");
          indicesToRemove.push(index);
        }
      }
    }

    removeIndices(indicesToRemove);
    return value;
  };

  const consumeString = ({ name, alias }: ValueFlagOptions): string | undefined => {
    const indicesToRemove: number[] = [];

    for (let index = 0; index < remaining.length; index += 1) {
      const token = remaining[index];
      const match = matchLongFlag(token, name);
      if (match.matched) {
        indicesToRemove.push(index);
        if (match.value !== undefined) {
          removeIndices(indicesToRemove);
          return match.value;
        }

        const next = takeValue(index + 1);
        removeIndices(indicesToRemove);
        return next;
      }

      if (alias) {
        const aliasMatch = matchShortFlag(token, alias);
        if (aliasMatch.matched) {
          indicesToRemove.push(index);
          if (aliasMatch.value !== undefined) {
            removeIndices(indicesToRemove);
            return aliasMatch.value;
          }

          const next = takeValue(index + 1);
          removeIndices(indicesToRemove);
          return next;
        }
      }
    }

    removeIndices(indicesToRemove);
    return undefined;
  };

  const consumeNumber = ({ name, alias, radix = 10 }: NumberFlagOptions): number | undefined => {
    const raw = consumeString({ name, alias });
    if (raw === undefined) {
      return undefined;
    }

    const parsed = Number.parseInt(raw, radix);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    consumeBoolean,
    consumeString,
    consumeNumber,
    rest: () => [...remaining],
  };
}

export interface ScriptLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createScriptLogger(scriptName: string): ScriptLogger {
  const prefix = `[${scriptName}]`;

  return {
    info: (...args: unknown[]) => {
      console.log(prefix, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(prefix, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(prefix, ...args);
    },
  };
}
